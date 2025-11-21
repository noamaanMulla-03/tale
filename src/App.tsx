import "./App.css";
import { BrowserRouter as Router, Route, Routes } from "react-router-dom";
import { SignUpForm } from "./features/auth/components/SignUpForm";
import { LoginForm } from "./features/auth/components/LoginForm";
import AuthPageWrapper from "./pages/AuthPageWrapper";

function App() {

    return (
        <div className="App">
            <Router>
                <Routes>
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
