// js/auth.js

const Auth = {
    userProfile: null, // Cache para guardar o perfil (role, pilot_id)

    /**
     * Busca o perfil do usuário logado (da tabela 'profiles')
     */
    async getUserProfile() {
        if (this.userProfile) return this.userProfile; // Retorna do cache se já tiver

        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return null;

        console.log('[DEBUG] Buscando perfil para User ID:', user.id); // <-- LOG 1

        const { data: profile, error } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', user.id)
            .single();
        
        if (error) {
            console.error("[DEBUG] Erro ao buscar perfil:", error.message);
            // Se o perfil não existe (erro 'PGRST116'), isso não é um erro fatal aqui
            if (error.code === 'PGRST116') {
                 console.warn('[DEBUG] Perfil não encontrado no banco de dados para este usuário.');
                 return null; // Retorna null se não achar o perfil
            }
            return null; // Outro erro, retorna null
        }
        
        console.log('[DEBUG] Perfil encontrado no DB:', profile); // <-- LOG 2
        
        this.userProfile = profile; // Salva no cache
        return profile;
    },

    /**
     * Tenta logar o usuário. Se sucesso, busca o perfil e retorna a 'role'.
     */
    async login(email, password) {
        const { data, error } = await supabase.auth.signInWithPassword({
            email: email,
            password: password,
        });

        if (error) {
            console.error('[DEBUG] Erro no Supabase signInWithPassword:', error.message);
            if (error.message.includes('Invalid login credentials')) {
                return { success: false, message: "Email ou senha inválidos." };
            }
            return { success: false, message: "Erro ao tentar logar." };
        }
        
        // Sucesso, agora busca o perfil
        this.userProfile = null; // Limpa cache antigo
        const profile = await this.getUserProfile();
        
        if (!profile) {
            console.error('[DEBUG] Login OK, mas getUserProfile falhou ou não encontrou perfil.');
            await this.logout(); // Desloga usuário se ele não tiver um perfil
            return { success: false, message: "Usuário logado, mas sem perfil de permissão configurado." };
        }

        console.log('[DEBUG] Login retornando role:', profile.role); // <-- LOG 3

        return { success: true, role: profile.role }; // Retorna a 'role' para o app.js
    },

    /**
     * Desloga o usuário e limpa o cache do perfil.
     */
    async logout() {
        console.log('[DEBUG] Iniciando logout...');
        const { error } = await supabase.auth.signOut();
        this.userProfile = null; // Limpa o cache do perfil
        if (error) {
            console.error('[DEBUG] Erro no Supabase signOut:', error.message);
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
        // console.log('[DEBUG] Sessão atual:', session); // Log opcional
        return !!session;
    },

    /**
     * Verifica a autenticação ao carregar a página e direciona o usuário.
     */
    async checkAuth() {
        console.log('[DEBUG] checkAuth: Verificando se está autenticado...');
        if (await this.isAuthenticated()) {
            console.log('[DEBUG] checkAuth: Autenticado. Buscando perfil...');
            const profile = await this.getUserProfile();
            if (profile) {
                console.log('[DEBUG] checkAuth: Perfil encontrado, chamando App.routeUser...');
                await App.routeUser(profile.role);
            } else {
                console.warn("[DEBUG] checkAuth: Usuário autenticado mas sem perfil. Deslogando.");
                await this.logout(); // Perfil não encontrado, desloga
            }
        } else {
            console.log('[DEBUG] checkAuth: Não autenticado. Mostrando tela de login.');
            UI.showView('login-view');
        }
    }
};