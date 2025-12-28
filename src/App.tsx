import "./App.css";
import { BrowserRouter as Router, Route, Routes } from "react-router-dom";
import { SignUpForm } from "./features/auth/components/SignUpForm";
import { LoginForm } from "./features/auth/components/LoginForm";
import AuthPageWrapper from "./pages/AuthPageWrapper";
import { Toaster } from "sonner";
import { toastConfig } from "./lib/utils";
import { EmailVerification } from "./features/auth/components/EmailVerification";
import EmailVerificationPageWrapper from "./pages/onBoarding/EmailVerificationPageWrapper";
import ProfilePageWrapper from "./pages/onBoarding/ProfilePageWrapper";
import ProfilePage from "./features/profile/components/profilePage";
import ProtectedRoute from "./router/ProtectedRoute";
import ProfileCompletionGuard from "./router/ProfileCompletionGuard";
import ChatPage from "./pages/ChatPage";
// Base weight (400)
import "@fontsource/nunito";
// Italics (for emphasized messages)
import "@fontsource/nunito/400-italic.css";
// Semi-bold (Great for usernames in chat)
import "@fontsource/nunito/600.css";
// Bold (For headings)
import "@fontsource/nunito/700.css";

function App() {

    return (
        <div className="App">
            {/* toast notification container */}
            <Toaster {...toastConfig}
            />
            <Router>
                <Routes>

                    {/* Default route to login page */}
                    <Route path="/" element={
                        <AuthPageWrapper>
                            <LoginForm />
                        </AuthPageWrapper>
                    } />

                    {/* Route for login page */}
                    <Route path="/login" element={
                        <AuthPageWrapper>
                            <LoginForm />
                        </AuthPageWrapper>
                    } />

                    {/* route for signup page */}
                    <Route path="/signup" element={
                        <AuthPageWrapper>
                            <SignUpForm />
                        </AuthPageWrapper>
                    } />

                    {/* route for email verification page */}
                    <Route path="/verify-email" element={
                        <EmailVerificationPageWrapper>
                            <EmailVerification />
                        </EmailVerificationPageWrapper>
                    } />

                    {/* Protected Routes - require authentication */}
                    <Route element={<ProtectedRoute />}>
                        {/* Profile setup - accessible to authenticated users without profile completion */}
                        <Route path="/profile-setup" element={
                            <ProfilePageWrapper>
                                <ProfilePage />
                            </ProfilePageWrapper>
                        } />

                        {/* Routes that require profile completion */}
                        <Route element={<ProfileCompletionGuard />}>
                            <Route path="/chat" element={<ChatPage />} />
                            {/* Add more protected routes here that require completed profile */}
                        </Route>
                    </Route>
                </Routes>
            </Router>
        </div>
    );

}

export default App;
