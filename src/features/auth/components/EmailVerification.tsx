import { useState } from 'react';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Mail, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface EmailVerificationProps {
    email: string;
    onVerify?: (code: string) => Promise<void>;
    onResend?: () => Promise<void>;
}

function EmailVerification({ email, onVerify, onResend }: EmailVerificationProps) {
    const [code, setCode] = useState('');
    const [isVerifying, setIsVerifying] = useState(false);
    const [isResending, setIsResending] = useState(false);

    const handleComplete = async (value: string) => {
        setCode(value);
        if (value.length === 6) {
            setIsVerifying(true);
            try {
                await onVerify?.(value);
                toast.success('Email verified successfully!');
            } catch (error) {
                toast.error('Invalid verification code');
                setCode('');
            } finally {
                setIsVerifying(false);
            }
        }
    };

    const handleResend = async () => {
        setIsResending(true);
        try {
            await onResend?.();
            toast.success('Verification code resent!');
            setCode('');
        } catch (error) {
            toast.error('Failed to resend code');
        } finally {
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
                    <span className="font-medium text-white">{email}</span>
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                <div className="flex flex-col items-center space-y-4">
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

                    {isVerifying && (
                        <div className="flex items-center gap-2 text-sm text-gray-400">
                            <Loader2 className="h-4 w-4 animate-spin text-orange-500" />
                            <span>Verifying your code...</span>
                        </div>
                    )}
                </div>

                <div className="text-center pt-4">
                    <p className="text-sm text-gray-500">
                        Didn't receive the code?{' '}
                        <Button
                            variant="link"
                            className="h-auto p-0 ml-4 text-sm font-medium text-orange-500 hover:text-orange-400 underline-offset-4 hover:underline"
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

export default EmailVerification;