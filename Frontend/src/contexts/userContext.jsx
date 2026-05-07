import { createContext, useContext, useEffect, useState } from "react";

const UserContext = createContext();

export function UserProvider({ children }) {
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState();
  useEffect(() => {
    
      const getUser = async () => {
        try{const res = await fetch(
          `${import.meta.env.VITE_SERVER_URL}/api/isLoggedIn`,
          { credentials: "include" }
        );
        if (!res.ok) {
          throw new Error(res.statusText || "Failed to fetch user data");
        }
        const data = await res.json();
        setUser(data.user);
        setLoading(false);
      } catch (error) {
        setLoading(false);
      };
    }
      getUser();
  }, []);
  return (
    <UserContext.Provider value={{ user, setUser, loading }}>
      {children}
    </UserContext.Provider>
  );
}

export function useUser() {
  return useContext(UserContext);
}
