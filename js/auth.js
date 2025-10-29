// js/auth.js (v10 - Logs removidos)

const Auth = {
    userProfile: null, 

    async getUserProfile() {
        if (this.userProfile) return this.userProfile; 
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        if (userError || !user) { console.error('Erro getUserProfile:', userError?.message || 'No user'); return null; }
        
        const { data: profile, error: profileError } = await supabase.from('profiles').select('*').eq('id', user.id).single();
        if (profileError) { 
            if (profileError.code !== 'PGRST116') { // Não loga erro se for apenas 'não encontrado'
                 console.error("Erro buscar perfil:", profileError.message); 
            }
            return null; 
        }
        this.userProfile = profile; return profile;
    },

    async login(email, password) {
        if (typeof email !== 'string' || typeof password !== 'string') { return { success: false, message: "Erro interno." }; }
        const { error: signInError } = await supabase.auth.signInWithPassword({ email: email, password: password });
        if (signInError) { 
            console.error('Erro signIn:', signInError.message); 
            if (signInError.message.includes('Invalid login')) { return { success: false, message: "Email/senha inválidos." }; } 
            // Mostra a mensagem específica do Supabase (ex: Email not confirmed)
            return { success: false, message: signInError.message }; 
        }
        
        const { data: { user: loggedInUser }, error: getUserError } = await supabase.auth.getUser();
        if (getUserError || !loggedInUser) { console.error('Falha getUser pós-login:', getUserError?.message || 'No user'); await this.logout(); return { success: false, message: "Erro confirmar sessão." }; }
        
        this.userProfile = null; const profile = await this.getUserProfile(); 
        if (!profile) { console.error('Login OK, mas sem perfil.'); await this.logout(); return { success: false, message: "Usuário sem perfil." }; }
        
        return { success: true, role: profile.role }; 
    },

    async logout() {
        const { error } = await supabase.auth.signOut(); 
        this.userProfile = null; 
        if (error) { console.error('Erro signOut:', error.message, error); } 
        UI.showView('login-view');
    },

    async isAuthenticated() { 
        const { data: { session }, error } = await supabase.auth.getSession(); 
        if (error) { console.error("Erro getSession:", error.message); return false; } 
        return !!session; 
    },

    async checkAuth() {
        if (await this.isAuthenticated()) { 
            const profile = await this.getUserProfile(); 
            if (profile) { await App.routeUser(profile.role); } 
            else { console.warn("CheckAuth: Sem perfil! Deslogando."); await this.logout(); } 
        } else { UI.showView('login-view'); }
    }
};