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
import { loginUser } from "@/lib/api"
import useAuthStore from "@/store/useAuthStore"
import { Link } from "react-router-dom"

export function LoginForm({
    className,
    ...props
}: React.ComponentProps<"div">) {

    // destructure login from auth store
    const { login } = useAuthStore();
    // component state for form fields
    const [ email, setEmail ] = useState("");
    const [ password, setPassword ] = useState("");
    // error and loading states
    const [ error, setError ] = useState<string | null>(null);
    const [ isLoading, setIsLoading ] = useState<boolean>(false);

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {

        // prevent default form submission
        e.preventDefault();
        // set loading state
        setIsLoading(true);
        try {
            setError(null);
            // call login API
            const response = await loginUser({ email, password });
            // destructure user and token from response
            const { user, token } = response;
            // update auth store on successful login
            login(user, token);
        } catch(error) {
            // set error message on failure
            setError("Login failed. Please check your credentials and try again.");
        } finally {
            // set loading state to false after attempt
            setIsLoading(false);
        }
    };

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
                                    <a
                                        href="#"
                                        className="text-xs text-gray-400 underline-offset-4 hover:underline hover:text-gray-300"
                                    >
                                        Forgot password?
                                    </a>
                                </div>
                                <Input
                                    id="password"
                                    type="password"
                                    value={password}
                                    required
                                    placeholder="Enter your password"
                                    className="h-11 bg-[#3a3a3a] border-white/10 text-white placeholder:text-gray-500 focus:border-orange-500 focus:ring-orange-500"
                                    onChange={(e) => setPassword(e.target.value)}
                                />
                            </Field>

                            <Field className="pt-2">
                                <Button
                                    type="submit"
                                    disabled={isLoading}
                                    className="w-full h-11 bg-orange-500 hover:bg-orange-600 text-white font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    { isLoading ? "Logging in..." : "Log In" }
                                </Button>
                            </Field>

                            <FieldDescription className="text-center text-xs text-gray-500">
                                Don&apos;t have an account?{" "}
                                <Link 
                                    className="text-orange-500 underline-offset-4 hover:underline font-medium" 
                                    to="/signup"
                                >    
                                    Sign up
                                </Link>
                            </FieldDescription>
                        </FieldGroup>
                    </form>
                </CardContent>
            </Card>
        </div>
    )
}
