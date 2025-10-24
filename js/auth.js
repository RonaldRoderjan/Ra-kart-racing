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

        const { data: profile, error } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', user.id)
            .single();
        
        if (error) {
            console.error("Erro ao buscar perfil:", error.message);
            return null;
        }
        
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
            console.error('Erro no login:', error.message);
            if (error.message.includes('Invalid login credentials')) {
                return { success: false, message: "Email ou senha inválidos." };
            }
            return { success: false, message: "Erro ao tentar logar." };
        }
        
        // Sucesso, agora busca o perfil
        this.userProfile = null; // Limpa cache antigo
        const profile = await this.getUserProfile();
        
        if (!profile) {
            await this.logout(); // Desloga usuário se ele não tiver um perfil
            return { success: false, message: "Usuário logado, mas sem perfil de permissão." };
        }

        return { success: true, role: profile.role }; // Retorna a 'role' para o app.js
    },

    /**
     * Desloga o usuário e limpa o cache do perfil.
     */
    async logout() {
        const { error } = await supabase.auth.signOut();
        this.userProfile = null; // Limpa o cache do perfil
        if (error) {
            console.error('Erro no logout:', error.message);
        }
        UI.showView('login-view');
    },

    /**
     * Verifica se existe uma sessão de usuário válida.
     */
    async isAuthenticated() {
        const { data: { session } } = await supabase.auth.getSession();
        return !!session;
    },

    /**
     * Verifica a autenticação ao carregar a página e direciona o usuário.
     */
    async checkAuth() {
        if (await this.isAuthenticated()) {
            const profile = await this.getUserProfile();
            if (profile) {
                // Deixa o app.js decidir para onde ir
                await App.routeUser(profile.role);
            } else {
                console.warn("Usuário autenticado mas sem perfil. Deslogando.");
                await this.logout(); // Perfil não encontrado, desloga
            }
        } else {
            UI.showView('login-view');
        }
    }
};