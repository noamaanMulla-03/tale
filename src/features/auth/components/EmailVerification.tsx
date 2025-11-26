import { useState, useEffect } from 'react';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Mail, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
// import auth store
import useAuthStore from '@/store/useAuthStore';
// import email verification services
import { verifyEmailOTP, sendEmailOTP } from '../services/emailVerification';

// EmailVerification component
export function EmailVerification() {
    // get user from auth store
    const { user } = useAuthStore();
    // otp code state
    const [code, setCode] = useState('');
    // verification and resending states
    const [isVerifying, setIsVerifying] = useState(false);
    const [isResending, setIsResending] = useState(false);
    // 5 minutes in seconds
    const [timeLeft, setTimeLeft] = useState(300); 
    // percentage
    const [progress, setProgress] = useState(100); 

    // Timer effect
    useEffect(() => {
        // initialize timer
        const timer = setInterval(() => {
            setTimeLeft((prev) => {
                if (prev <= 0) {
                    clearInterval(timer);
                    return 0;
                }
                // update progress
                const newTime = prev - 1;
                // update progress
                setProgress((newTime / 300) * 100);
                // return new time
                return newTime;
            });
        // decrement every second
        }, 1000);

        // cleanup on unmount
        return () => clearInterval(timer);
        // Reset timer when resending
    }, [isResending]); 

    // format time in mm:ss
    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    // handle OTP completion
    const handleComplete = async (value: string) => {
        // update code state
        setCode(value);
        // verify OTP if 6 digits entered
        if (value.length === 6) {
            // verify OTP
            setIsVerifying(true);

            try {
                // verify email OTP by calling the service
                const response = await verifyEmailOTP(value);
                // show success toast
                toast.success(response.message);
            } catch (error: any) {
                // show error toast
                const errorMessage = error.response?.data?.error || 'Invalid verification code';
                toast.error(errorMessage);
                // clear code input on error
                setCode('');
            } finally {
                // reset verifying state
                setIsVerifying(false);
            }
        }
    };

    // handle resend OTP
    const handleResend = async () => {
        // set resending state
        setIsResending(true);

        try {
            // call send email OTP service
            await sendEmailOTP();
            // show success toast
            toast.success('Verification code resent!');
            // reset code and timer
            setCode('');
            // reset timer
            setTimeLeft(300);
            // reset progress
            setProgress(100);
        } catch (error: any) {
            // show error toast
            const errorMessage = error.response?.data?.error || 'Invalid verification code';
            toast.error(errorMessage);
        } finally {
            // reset resending state
            setIsResending(false);
        }
    };

    return (
        <Card className="w-[480px] bg-[#2a2a2a]/95 backdrop-blur-xl border-white/20 shadow-2xl">
            <CardHeader className="text-center space-y-3 gap-3 pb-8">
                <div className="mx-auto w-16 h-16 rounded-full bg-white/10 flex items-center justify-center mb-2 border border-white/10">
                    <Mail className="h-8 w-8 text-orange-500" />
                </div>
                <CardTitle className="text-3xl font-bold text-white">
                    Verify Your Email
                </CardTitle>
                <CardDescription className="text-gray-400 text-sm">
                    We've sent a 6-digit verification code to{' '}
                    <span className="font-medium text-white">{user?.email}</span>
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                <div className="flex flex-col items-center space-y-4">
                    <div className="relative">

                        {/* OTP Input */}
                        <InputOTP
                            maxLength={6}
                            value={code}
                            onChange={handleComplete}
                            disabled={isVerifying}
                        >
                            <InputOTPGroup className="gap-2">
                                <InputOTPSlot
                                    index={0}
                                    className="h-14 w-14 text-xl bg-[#3a3a3a] border-white/10 text-white focus:border-orange-500 focus:ring-orange-500"
                                />
                                <InputOTPSlot
                                    index={1}
                                    className="h-14 w-14 text-xl bg-[#3a3a3a] border-white/10 text-white focus:border-orange-500 focus:ring-orange-500"
                                />
                                <InputOTPSlot
                                    index={2}
                                    className="h-14 w-14 text-xl bg-[#3a3a3a] border-white/10 text-white focus:border-orange-500 focus:ring-orange-500"
                                />
                                <InputOTPSlot
                                    index={3}
                                    className="h-14 w-14 text-xl bg-[#3a3a3a] border-white/10 text-white focus:border-orange-500 focus:ring-orange-500"
                                />
                                <InputOTPSlot
                                    index={4}
                                    className="h-14 w-14 text-xl bg-[#3a3a3a] border-white/10 text-white focus:border-orange-500 focus:ring-orange-500"
                                />
                                <InputOTPSlot
                                    index={5}
                                    className="h-14 w-14 text-xl bg-[#3a3a3a] border-white/10 text-white focus:border-orange-500 focus:ring-orange-500"
                                />
                            </InputOTPGroup>
                        </InputOTP>
                    </div>

                    {/* Verifying Indicator */}
                    {isVerifying && (
                        <div className="flex items-center gap-2 text-sm text-gray-400">
                            <Loader2 className="h-4 w-4 animate-spin text-orange-500" />
                            <span>Verifying your code...</span>
                        </div>
                    )}

                    {/* Timer and Progress Bar */}
                    <div className="w-full space-y-2 px-6 pt-2">
                        <div className="flex justify-between items-center text-xs text-gray-400">
                            <span>Code expires in:</span>
                            <span className={`font-mono font-medium ${timeLeft < 60 ? 'text-orange-500' : 'text-white'}`}>
                                {formatTime(timeLeft)}
                            </span>
                        </div>
                        <Progress 
                            value={progress} 
                            className="h-1.5 bg-[#3a3a3a] [&>div]:bg-linear-to-r [&>div]:from-orange-500 [&>div]:to-orange-600"
                        />
                    </div>
                </div>
                
                {/* Resend Code */}
                <div className="text-center pt-4 relative z-10">
                    <p className="text-sm text-gray-500">
                        Didn't receive the code?{' '}
                        <Button
                            variant="link"
                            className="h-auto px-1 py-0 ml-4 text-sm font-medium text-orange-500 hover:text-orange-400 relative z-10"
                            onClick={handleResend}
                            disabled={isResending}
                        >
                            {isResending ? 'Resending...' : 'Resend'}
                        </Button>
                    </p>
                </div>
            </CardContent>
        </Card>
    );
}