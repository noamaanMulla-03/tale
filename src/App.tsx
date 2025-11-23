import "./App.css";
import { BrowserRouter as Router, Route, Routes } from "react-router-dom";
import { SignUpForm } from "./features/auth/components/SignUpForm";
import { LoginForm } from "./features/auth/components/LoginForm";
import AuthPageWrapper from "./pages/AuthPageWrapper";
import { Toaster } from "sonner";
import { toastConfig } from "./lib/utils";

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
                </Routes>
            </Router>
        </div>
    );

}

export default App;
