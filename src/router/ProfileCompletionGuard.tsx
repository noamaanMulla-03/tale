// Profile completion guard - redirects to profile setup if not completed
import { Navigate, Outlet } from 'react-router';
import useAuthStore from '@/store/useAuthStore';

const ProfileCompletionGuard = () => {
    const { user } = useAuthStore();

    // If profile is not completed, redirect to profile setup
    if (!user?.profileCompleted) {
        return <Navigate to="/profile-setup" replace />;
    }

    // If profile is completed, render child routes
    return <Outlet />;
};

export default ProfileCompletionGuard;
