import "./App.css";
import { SignUpForm } from "./features/auth/components/SignUpForm";
import AuthPage from "./pages/AuthPage";

function App() {

  	return (
		<div className="App">
			{/* <LoginPage /> */}
            <AuthPage>
                <SignUpForm />
            </AuthPage>
		</div>
	);

}

export default App;
