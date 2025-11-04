import { useUser, useAuth } from "@clerk/clerk-react";
import { useEffect } from "react";
export default function SyncUser() {
  const { user } = useUser();
  const { getToken } = useAuth();
  const backendurl = import.meta.env.VITE_BACKEND_URL;
  useEffect(() => {
    const syncUser = async () => {
      if (user) {
        const token = await getToken();
        const res = await fetch(`${backendurl}/api/sync`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`, // ✅ Send Clerk auth token
          },
          body: JSON.stringify({
            id: user.id,
            email: user.primaryEmailAddress?.emailAddress,
            username: user.username || user.firstName || "Unknown user",
          }),
        });

        const data = await res.json();
        console.log(data);
      }
    };

    syncUser();
  }, [user]);

  function Example() {
    const { getToken } = useAuth();

    async function logToken() {
      const token = await getToken();
      console.log(token);
    }

    return <button onClick={logToken}>Get Token</button>;
  } 

  return (
    <div>
      <Example />
    </div>
  );
}
