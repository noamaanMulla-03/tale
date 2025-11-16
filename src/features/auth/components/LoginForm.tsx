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

export function LoginForm({
    className,
    ...props
}: React.ComponentProps<"div">) {
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
                    <form className="space-y-6">
                        <FieldGroup>
                            <Field>
                                <FieldLabel htmlFor="email" className="text-gray-300">Email</FieldLabel>
                                <Input
                                    id="email"
                                    type="email"
                                    placeholder="m@example.com"
                                    required
                                    className="h-11 bg-[#3a3a3a] border-white/10 text-white placeholder:text-gray-500 focus:border-orange-500 focus:ring-orange-500"
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
                                    required
                                    placeholder="Enter your password"
                                    className="h-11 bg-[#3a3a3a] border-white/10 text-white placeholder:text-gray-500 focus:border-orange-500 focus:ring-orange-500"
                                />
                            </Field>

                            <Field className="pt-2">
                                <Button
                                    type="submit"
                                    className="w-full h-11 bg-orange-500 hover:bg-orange-600 text-white font-semibold"
                                >
                                    Sign in
                                </Button>
                            </Field>

                            <FieldDescription className="text-center text-xs text-gray-500">
                                Don&apos;t have an account?{" "}
                                <a href="#" className="text-orange-500 underline-offset-4 hover:underline font-medium">
                                    Sign up
                                </a>
                            </FieldDescription>
                        </FieldGroup>
                    </form>
                </CardContent>
            </Card>
        </div>
    )
}
