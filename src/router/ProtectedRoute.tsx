// import navigation and state management tools
import { Navigate, Outlet } from 'react-router';
import { useState, useEffect } from 'react';
// import auth store
import useAuthStore from '@/store/useAuthStore';

const ProtectedRoute = () => {
    // get auth state and actions from store
    const { isAuthenticated, checkAuth, logout } = useAuthStore();
    // state to track if auth check is in progress
    const [ isChecking, setIsChecking ] = useState(true);

    // effect to verify auth status on mount
    useEffect(() => {
        const verifyAuth = () => {
            // check if token is valid
            if(!checkAuth())
                // if not then logout (clear everything)
                logout();

            // done checking
            setIsChecking(false);
        }

        // call the function
        verifyAuth();
    // dependencies to avoid stale closures
    }, [checkAuth, logout]); 

    // while checking auth status, render nothing or a loader
    if(isChecking) 
        return <div>Loading...</div>; // or a loading spinner component
    
    // if not authenticated, redirect to login
    if(!isAuthenticated)
        return <Navigate to="/login" replace />;

    // if authenticated, render the child routes
    return <Outlet />;
}

// export protected route component
export default ProtectedRoute;