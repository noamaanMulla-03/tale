import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card"
import {
    Field,
    FieldDescription,
    FieldGroup,
    FieldLabel,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { useState } from "react"
import { registerUser } from "@/lib/api"
import useAuthStore from "@/store/useAuthStore"
import { Link } from "react-router-dom"

export function SignUpForm({
    className,
    ...props
}: React.ComponentProps<"div">) {

    // destructure login from auth store
    const { login } = useAuthStore();
    // component state for form fields
    const [ username, setUsername ] = useState("");
    const [ email, setEmail ] = useState("");
    const [ password, setPassword ] = useState("");
    const [ confirmPassword, setConfirmPassword ] = useState("");
    // error and loading states
    const [ error, setError ] = useState<string | null>(null);
    const [ isLoading, setIsLoading ] = useState<boolean>(false);

    // sign up form submit handler
    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {

        // prevent default form submission
        e.preventDefault();
        // set loading state
        setIsLoading(true);
        // set error state
        setError(null);

        try {
            // store password validation error status
            const passwordValidationError = validatePasswords(password, confirmPassword);

            // if password has discrepencies
            if(passwordValidationError) {
                // set error state to password error
                setError(passwordValidationError);
                // set loading state to false
                setIsLoading(false);
                // exit the function
                return;
            }

            // call registration API
            const response = await registerUser({ username, email, password });
            // destructure user and token from response
            const { user, token } = response;
            // update auth store on successful login
            login(user, token);

        } catch(error) {
            // set error message on failure
            setError("Registration failed! Please try again.");

        } finally {
            // set loading state to false after attempt
            setIsLoading(false);
        }
    };

    // handler function to validate password
    const validatePasswords = (password: string, confirmPassword: string) => {

        // password should be of atleast 8 characters
        if(password.length < 8)
            return "Password should be of atleast 8 characters."
        // password does not match confirm password

        if(password !== confirmPassword)
            return "Passwords does not match."

        // password has no discrepency, return no error
        return null;
    }

    return (
        <div className={cn("flex flex-col gap-6", className)} {...props}>
            <Card className="w-[480px] bg-[#2a2a2a]/95 backdrop-blur-xl border-white/20 shadow-2xl">
                <CardHeader className="text-center space-y-3 pb-8">
                    <div className="mx-auto w-16 h-16 rounded-full bg-white/10 flex items-center justify-center mb-2 border border-white/10">
                        <div className="w-8 h-8 rounded-full border-2 border-orange-500/50" />
                    </div>
                    <CardTitle className="text-3xl font-bold text-white">
                        Welcome to <span className="text-orange-500">Tale</span>
                    </CardTitle>
                    <CardDescription className="text-gray-400 text-sm">
                        Follow your conversations the meaningful way.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <form  onSubmit={handleSubmit} className="space-y-6">
                        {error && (
                            // give the error a border of text-red-500 and make it thick
                            <div className="text-red-500 text-sm mb-4 border-red-500 border p-2 rounded">
                                {error}
                            </div>
                        )}
                        <FieldGroup>
                            <Field>
                                <FieldLabel htmlFor="username" className="text-gray-300">Username</FieldLabel>
                                <Input
                                    id="username"
                                    type="text"
                                    placeholder="Enter a username"
                                    value={username}
                                    required
                                    className="h-11 bg-[#3a3a3a] border-white/10 text-white placeholder:text-gray-500 focus:border-orange-500 focus:ring-orange-500"
                                    onChange={(e) => setUsername(e.target.value)}
                                />
                            </Field>

                            <Field>
                                <FieldLabel htmlFor="email" className="text-gray-300">Email</FieldLabel>
                                <Input
                                    id="email"
                                    type="email"
                                    placeholder="Enter your email"
                                    value={email}
                                    required
                                    className="h-11 bg-[#3a3a3a] border-white/10 text-white placeholder:text-gray-500 focus:border-orange-500 focus:ring-orange-500"
                                    onChange={(e) => setEmail(e.target.value)}
                                />
                            </Field>

                            <Field>
                                <div className="flex items-center justify-between mb-2">
                                    <FieldLabel htmlFor="password" className="text-gray-300">Password</FieldLabel>
                                </div>
                                <Input
                                    id="password"
                                    type="password"
                                    value={password}
                                    required
                                    placeholder="Enter a password"
                                    className="h-11 bg-[#3a3a3a] border-white/10 text-white placeholder:text-gray-500 focus:border-orange-500 focus:ring-orange-500"
                                    onChange={(e) => setPassword(e.target.value)}
                                />
                            </Field>

                            <Field>
                                <div className="flex items-center justify-between mb-2">
                                    <FieldLabel htmlFor="password" className="text-gray-300">Confirm Password</FieldLabel>
                                </div>
                                <Input
                                    id="confirmPassword"
                                    type="password"
                                    value={confirmPassword}
                                    required
                                    placeholder="Confirm password"
                                    className="h-11 bg-[#3a3a3a] border-white/10 text-white placeholder:text-gray-500 focus:border-orange-500 focus:ring-orange-500"
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                />
                            </Field>

                            <Field className="pt-2">
                                <Button
                                    type="submit"
                                    disabled={isLoading}
                                    className="w-full h-11 bg-orange-500 hover:bg-orange-600 text-white font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    { isLoading ? "Creating account..." : "Sign Up" }
                                </Button>
                            </Field>

                            <FieldDescription className="text-center text-xs text-gray-500">
                                Already have an account?{" "}
                                <Link 
                                    className="text-orange-500 underline-offset-4 hover:underline font-medium" 
                                    to="/login"
                                >
                                    Log in
                                </Link>
                            </FieldDescription>
                        </FieldGroup>
                    </form>
                </CardContent>
            </Card>
        </div>
    )
}
