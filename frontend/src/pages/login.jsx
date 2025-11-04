import { useUser, useAuth } from "@clerk/clerk-react";
import { useEffect, useState } from "react";

export default function SyncUser() {
  const { user, isLoaded: userLoaded } = useUser();
  const { getToken, isLoaded: authLoaded } = useAuth();
  const backendurl = import.meta.env.VITE_BACKEND_URL;
  const [syncStatus, setSyncStatus] = useState("idle"); // idle, syncing, success, error
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    const syncUser = async () => {
      // Wait for both user and auth to be loaded
      if (!userLoaded || !authLoaded || !user) {
        return;
      }

      try {
        setSyncStatus("syncing");
        setErrorMessage("");

        const token = await getToken();
        
        if (!token) {
          throw new Error("Failed to get authentication token");
        }

        console.log("🔄 Syncing user to backend...");
        
        const res = await fetch(`${backendurl}/api/sync`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          // No body needed - backend gets user info from Clerk token
        });

        if (!res.ok) {
          const errorData = await res.json().catch(() => ({ error: "Unknown error" }));
          throw new Error(errorData.error || `HTTP ${res.status}: ${res.statusText}`);
        }

        const data = await res.json();
        console.log("✅ User sync successful:", data);
        setSyncStatus("success");
        
        // Clear success message after 3 seconds
        setTimeout(() => setSyncStatus("idle"), 3000);
      } catch (error) {
        console.error("❌ Error syncing user:", error);
        setSyncStatus("error");
        setErrorMessage(error.message || "Failed to sync user. Please try again.");
        
        // Clear error after 5 seconds
        setTimeout(() => {
          setSyncStatus("idle");
          setErrorMessage("");
        }, 5000);
      }
    };

    syncUser();
  }, [user, userLoaded, authLoaded, getToken, backendurl]);

  function Example() {
    const { getToken } = useAuth();

    async function logToken() {
      const token = await getToken();
      console.log("Token:", token ? "Received" : "Not available");
    }

    return <button onClick={logToken}>Get Token</button>;
  } 

  return (
    <div className="p-4">
      {syncStatus === "syncing" && (
        <div className="mb-4 p-3 bg-blue-900/20 border border-blue-800 rounded-lg">
          <p className="text-blue-400">🔄 Syncing user...</p>
        </div>
      )}
      
      {syncStatus === "success" && (
        <div className="mb-4 p-3 bg-green-900/20 border border-green-800 rounded-lg">
          <p className="text-green-400">✅ User synced successfully!</p>
        </div>
      )}
      
      {syncStatus === "error" && (
        <div className="mb-4 p-3 bg-red-900/20 border border-red-800 rounded-lg">
          <p className="text-red-400">❌ {errorMessage}</p>
        </div>
      )}
      
      <Example />
    </div>
  );
}
