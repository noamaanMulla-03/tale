import "./App.css";
import { BrowserRouter as Router, Route, Routes } from "react-router-dom";
import { SignUpForm } from "./features/auth/components/SignUpForm";
import { LoginForm } from "./features/auth/components/LoginForm";
import AuthPageWrapper from "./pages/AuthPageWrapper";
import { Toaster } from "sonner";
import { toastConfig } from "./lib/utils";
import EmailVerification from "./features/auth/components/EmailVerification";
import EmailVerificationPageWrapper from "./pages/onBoarding/EmailVerificationPageWrapper";
import useAuthStore from "./store/useAuthStore";

function App() {
    const { user } = useAuthStore();

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
                            <EmailVerification 
                                email={user?.email || ''}
                                onVerify={async (code) => {
                                    // TODO: Implement verification logic
                                    console.log('Verifying code:', code);
                                }}
                                onResend={async () => {
                                    // TODO: Implement resend logic
                                    console.log('Resending code');
                                }}
                            />
                        </EmailVerificationPageWrapper>
                    } />
                </Routes>
            </Router>
        </div>
    );

}

export default App;
