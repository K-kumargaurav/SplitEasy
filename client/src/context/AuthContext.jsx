import { createContext, useContext, useEffect, useState } from "react";

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [token, setToken] = useState(localStorage.getItem("token"));
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const savedUser = localStorage.getItem("user");
        const savedToken = localStorage.getItem("token");
        if(savedUser && savedToken) {
            try {
                const payload = JSON.parse(atob(savedToken.split(".")[1]));
                if (payload.exp * 1000 < Date.now()) {
                    localStorage.removeItem("user");
                    localStorage.removeItem("token");
                    setToken(null);
                } else {
                setUser(JSON.parse(savedUser));
                }
            } catch {
                localStorage.removeItem("user");
            }
        }
        setLoading(false);

        const handleStorageChange = () => {
            const savedUser = localStorage.getItem("user");
            const savedToken = localStorage.getItem("token");

            if(!savedToken) {
                setUser(null);
                setToken(null);
            } else if(savedUser) {
                setUser(JSON.parse(savedUser));
            }
        };

        window.addEventListener("storage", handleStorageChange);

        return () => window.removeEventListener("storage", handleStorageChange);
    }, [token]);

    const login = (userData, authToken) => {
        setUser(userData);
        setToken(authToken);

        localStorage.setItem("token", authToken);
        localStorage.setItem("user", JSON.stringify(userData));
    };

    const logout = () => {
        setUser(null);
        setToken(null);

        localStorage.removeItem("token");
        localStorage.removeItem("user");
    };

    return (
        <AuthContext.Provider value={{ user, token, login, logout, loading }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);
