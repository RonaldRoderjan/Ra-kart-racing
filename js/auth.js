// js/auth.js

const Auth = {
    userProfile: null, // Cache para guardar o perfil (role, pilot_id)

    /**
     * Busca o perfil do usuário logado (da tabela 'profiles')
     */
    async getUserProfile() {
        if (this.userProfile) return this.userProfile; 

        const { data: { user }, error: userError } = await supabase.auth.getUser();
        if (userError || !user) {
            console.error('[DEBUG] Erro ao obter usuário da sessão Supabase em getUserProfile:', userError?.message || 'Usuário não encontrado');
            return null;
        }
        // console.log('[DEBUG] Buscando perfil para User ID:', user.id); 

        const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', user.id)
            .single();
        
        if (profileError) {
            console.error("[DEBUG] Erro ao buscar perfil:", profileError.message);
            if (profileError.code === 'PGRST116') {
                 // console.warn('[DEBUG] Perfil não encontrado no banco de dados para este usuário.');
                 return null; 
            }
            return null; 
        }
        // console.log('[DEBUG] Perfil encontrado no DB:', profile); 
        
        this.userProfile = profile; 
        return profile;
    },

    /**
     * Tenta logar o usuário. Se sucesso, busca o perfil e retorna a 'role'.
     */
    async login(email, password) {
        // << --- LOGS EXTRAS AQUI --- >>
        console.log('[DEBUG][Auth.login] Recebido - Email:', email, typeof email);
        console.log('[DEBUG][Auth.login] Recebido - Senha:', password ? '******' : '(vazio)', typeof password);
        // << ------------------------ >>

        // Verifica se email e password são strings antes de enviar
        if (typeof email !== 'string' || typeof password !== 'string') {
             console.error('[DEBUG][Auth.login] ERRO: Email ou Senha não são strings!');
             return { success: false, message: "Erro interno: dados de login inválidos." };
        }


        const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
            email: email, // Garante que está passando a variável 'email'
            password: password, // Garante que está passando a variável 'password'
        });

        if (signInError) {
            console.error('[DEBUG] Erro no Supabase signInWithPassword:', signInError.message);
            if (signInError.message.includes('Invalid login credentials')) {
                return { success: false, message: "Email ou senha inválidos." };
            }
            // Retorna a mensagem de erro específica do Supabase se não for 'Invalid credentials'
            return { success: false, message: `Erro ao tentar logar: ${signInError.message}` }; 
        }

        // Confirma qual usuário o Supabase reconheceu APÓS o signIn
        const { data: { user: loggedInUser }, error: getUserError } = await supabase.auth.getUser();
        if (getUserError || !loggedInUser) {
             console.error('[DEBUG] Login OK, mas falha ao obter usuário logo após:', getUserError?.message || 'Usuário pós-login não encontrado');
             await this.logout();
             return { success: false, message: "Erro ao confirmar sessão após login." };
        }
        // console.log('[DEBUG] Usuário confirmado logo após login:', loggedInUser.id);
        
        // Sucesso, agora busca o perfil
        this.userProfile = null; 
        const profile = await this.getUserProfile(); 
        
        if (!profile) {
            console.error('[DEBUG] Login OK, mas getUserProfile falhou ou não encontrou perfil.');
            await this.logout(); 
            return { success: false, message: "Usuário logado, mas sem perfil de permissão configurado." };
        }

        // console.log('[DEBUG] Login retornando role:', profile.role); 

        return { success: true, role: profile.role }; 
    },

    /**
     * Desloga o usuário e limpa o cache do perfil.
     */
    async logout() {
        console.log('[DEBUG] Iniciando logout...');
        const { error } = await supabase.auth.signOut();
        this.userProfile = null; 
        if (error) {
            // Log do erro 403 que vimos antes
            console.error('[DEBUG] Erro no Supabase signOut:', error.message, error); 
        }
        console.log('[DEBUG] Logout concluído, mostrando tela de login.');
        UI.showView('login-view');
    },

    /**
     * Verifica se existe uma sessão de usuário válida.
     */
    async isAuthenticated() {
        const { data: { session }, error } = await supabase.auth.getSession();
         if (error) {
            console.error("[DEBUG] Erro ao verificar sessão:", error.message);
            return false;
        }
        return !!session;
    },

    /**
     * Verifica a autenticação ao carregar a página e direciona o usuário.
     */
    async checkAuth() {
        // console.log('[DEBUG] checkAuth: Verificando se está autenticado...');
        if (await this.isAuthenticated()) {
            // console.log('[DEBUG] checkAuth: Autenticado. Buscando perfil...');
            const profile = await this.getUserProfile();
            if (profile) {
                // console.log('[DEBUG] checkAuth: Perfil encontrado, chamando App.routeUser...');
                await App.routeUser(profile.role);
            } else {
                console.warn("[DEBUG] checkAuth: Usuário autenticado mas sem perfil. Deslogando.");
                await this.logout(); 
            }
        } else {
            // console.log('[DEBUG] checkAuth: Não autenticado. Mostrando tela de login.');
            UI.showView('login-view');
        }
    }
};