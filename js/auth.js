// js/auth.js

const Auth = {
    /**
     * Tenta logar o usuário no Supabase.
     * O Supabase gerencia o JWT automaticamente no LocalStorage.
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
        
        return { success: true };
    },

    /**
     * Desloga o usuário.
     * O Supabase limpa o JWT do LocalStorage.
     */
    async logout() {
        const { error } = await supabase.auth.signOut();
        if (error) {
            console.error('Erro no logout:', error.message);
        }
        UI.showView('login-view');
    },

    /**
     * Verifica se existe uma sessão de usuário válida (JWT) no LocalStorage.
     */
    async isAuthenticated() {
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
            console.error("Erro ao verificar sessão:", error.message);
            return false;
        }
        
        return !!session;
    },

    /**
     * Verifica a autenticação ao carregar a página e direciona o usuário.
     */
    async checkAuth() {
        if (await this.isAuthenticated()) {
            UI.showView('app-view');
            await UI.renderDashboard(); // Precisa de 'await'
        } else {
            UI.showView('login-view');
        }
    },
    
    /**
     * Helper para pegar os dados do usuário logado (ex: email), se necessário.
     */
    async getCurrentUser() {
        const { data: { user } } = await supabase.auth.getUser();
        return user;
    }
};