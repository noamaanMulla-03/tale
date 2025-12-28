import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Field, FieldLabel } from '@/components/ui/field';
import { Camera, CalendarIcon } from 'lucide-react';
import useAuthStore from '@/store/useAuthStore';
import { toast } from 'sonner';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from "@/components/ui/calendar"
import { format } from 'date-fns/format';
import { Textarea } from '@/components/ui/textarea';
import { z } from 'zod';

// Zod schema for profile validation
const profileSchema = z.object({
    // Display Name must be at least 2 characters
    displayName: z.string().min(1, 'Display name is required').min(2, 'Display name must be at least 2 characters'),
    // Gender is optional
    gender: z.string().optional(),
    // Date of Birth must be a valid date
    dob: z.date({
        message: "Date of birth is required"
    }),
    // Phone number must match a basic phone number pattern
    phoneNumber: z.string().min(1, 'Phone number is required').regex(/^[0-9+\-\s()]+$/, 'Please enter a valid phone number'),
    // Bio is optional
    bio: z.string().optional(),
});

export function ProfilePage() {
    const { user } = useAuthStore();
    const [isSaving, setIsSaving] = useState(false);
    // Display Name state initialized as empty string
    const [displayName, setDisplayName] = useState('');
    // Gender state initialized as empty string
    const [gender, setGender] = useState('');
    // Date of Birth state initialized as undefined
    const [dob, setDob] = useState<Date | undefined>(undefined);
    // Phone number state initialized as empty string
    const [phoneNumber, setPhoneNumber] = useState('');
    // Bio state initialized as empty string
    const [bio, setBio] = useState('');

    const handleSave = async () => {
        // Validate form data
        const validation = profileSchema.safeParse({
            displayName,
            gender: gender || undefined,
            dob,
            phoneNumber,
            bio: bio || undefined,
        });

        if (!validation.success) {
            // Show first validation error
            const firstError = validation.error.issues[0];
            toast.error(firstError.message);
            return;
        }

        setIsSaving(true);
        try {
            // TODO: Add API call to update profile
            await new Promise(resolve => setTimeout(resolve, 1000));
            toast.success('Profile updated successfully!');
        } catch (error) {
            toast.error('Failed to update profile');
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="w-full max-w-7xl mx-auto space-y-6 animate-in fade-in duration-500">
            {/* Page Header */}
            <div className="space-y-2">
                <h1 className="text-4xl pb-2 font-bold text-white bg-gradient-to-r from-white to-gray-400 bg-clip-text text-transparent">
                    Set up your Profile
                </h1>
                <p className="text-gray-400 text-sm pb-6">Let others know more about you</p>
            </div>

            {/* Two Column Layout */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Left Column - User Info Card */}
                <Card className="bg-[#2a2a2a]/95 backdrop-blur-xl border-white/20 shadow-2xl flex flex-col hover:shadow-orange-500/5 transition-shadow duration-300">
                    <CardContent className="text-center space-y-6 pt-12 pb-12 flex-1 flex flex-col">
                        <div>
                            <CardTitle className="text-3xl font-bold text-white mb-2">
                                {user?.username}
                            </CardTitle>
                            <p className="text-sm text-gray-400">Set up your profile picture</p>
                        </div>
                        <div className="flex-1 flex items-center justify-center px-8">
                            <div className="relative w-full aspect-square max-w-md group">
                                <Avatar className="w-full h-full border-8 border-[#3a3a3a] transition-all duration-300 group-hover:border-orange-500/30">
                                    <AvatarImage src={user?.avatarUrl} alt={user?.username} />
                                    <AvatarFallback className="bg-gradient-to-br from-orange-500 to-orange-600 text-white text-9xl font-bold">
                                        {user?.username?.charAt(0).toUpperCase()}
                                    </AvatarFallback>
                                </Avatar>
                                <button className="absolute bottom-4 right-4 p-4 bg-gradient-to-br from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 rounded-full border-4 border-[#2a2a2a] transition-all duration-200 shadow-xl hover:scale-110 hover:shadow-orange-500/50 group">
                                    <Camera className="h-6 w-6 text-white" />
                                </button>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Right Column - Bio & Details */}
                <Card className="bg-[#2a2a2a]/95 backdrop-blur-xl border-white/20 shadow-2xl flex flex-col hover:shadow-orange-500/5 transition-shadow duration-300">
                    <CardHeader className="flex flex-row items-center justify-between pb-6 border-b border-white/5">
                        <div>
                            <CardTitle className="text-xl font-bold text-white">Bio & other details</CardTitle>
                            <p className="text-sm text-gray-400 mt-1">Complete your profile information</p>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="flex gap-2">
                                <Button
                                    onClick={handleSave}
                                    disabled={isSaving}
                                    size="sm"
                                    className="bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white shadow-lg shadow-orange-500/20 transition-all duration-200 hover:shadow-orange-500/40 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {isSaving ? 'Saving...' : 'Save profile'}
                                </Button>
                            </div>
                        </div>
                    </CardHeader>

                    <CardContent className="space-y-6 pt-6">
                        {/* Two Column Grid for Fields */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

                            {/* Display Name */}
                            <Field className="group">
                                <FieldLabel className="text-gray-400 text-xs font-normal flex items-center gap-2">
                                    Display name
                                    <span className="text-orange-500 text-sm">*</span>
                                </FieldLabel>
                                <Input
                                    value={displayName}
                                    onChange={(e) => setDisplayName(e.target.value)}
                                    className="h-11 bg-[#1a1a1a]/50 border border-white/5 rounded-lg text-white font-medium px-3 focus-visible:ring-2 focus-visible:ring-orange-500/50 focus-visible:border-orange-500/50 transition-all duration-200 hover:border-white/10"
                                    placeholder="Enter your display name"
                                    required
                                />
                            </Field>

                            {/* Gender */}
                            <Field className="group">
                                <FieldLabel className="text-gray-400 text-xs font-normal flex items-center gap-2">
                                    Gender
                                    <span className="text-gray-600 text-xs">(Optional)</span>
                                </FieldLabel>
                                <Select value={gender} onValueChange={setGender}>
                                    <SelectTrigger className="h-11 bg-[#1a1a1a]/50 border border-white/5 rounded-lg text-white font-medium px-3 focus:ring-2 focus:ring-orange-500/50 focus:border-orange-500/50 transition-all duration-200 hover:border-white/10 data-[placeholder]:text-gray-500">
                                        <SelectValue placeholder="Select your gender" />
                                    </SelectTrigger>
                                    <SelectContent className="bg-[#2a2a2a] border-white/20 rounded-lg">
                                        <SelectGroup>
                                            <SelectItem value="male" className="text-white focus:bg-orange-500/20 focus:text-white rounded-md">Male</SelectItem>
                                            <SelectItem value="female" className="text-white focus:bg-orange-500/20 focus:text-white rounded-md">Female</SelectItem>
                                            <SelectItem value="other" className="text-white focus:bg-orange-500/20 focus:text-white rounded-md">Other</SelectItem>
                                        </SelectGroup>
                                    </SelectContent>
                                </Select>
                            </Field>

                            {/* Date of Birth */}
                            <Field className="group">
                                <FieldLabel className="text-gray-400 text-xs font-normal flex items-center gap-2">
                                    Date of Birth
                                    <span className="text-orange-500 text-sm">*</span>
                                </FieldLabel>
                                <Popover>
                                    <PopoverTrigger asChild>
                                        <Button
                                            variant="ghost"
                                            data-empty={!dob}
                                            className="h-11 w-full bg-[#1a1a1a]/50 border border-white/5 rounded-lg text-white font-medium px-3 justify-start hover:bg-[#1a1a1a] hover:border-white/10 data-[empty=true]:text-gray-500 transition-all duration-200 focus:ring-2 focus:ring-orange-500/50"
                                        >
                                            <CalendarIcon className="mr-2 h-4 w-4 text-orange-500" />
                                            {dob ? format(dob, "PPP") : <span>Pick a date</span>}
                                        </Button>
                                    </PopoverTrigger>
                                    <PopoverContent
                                        className="p-0 bg-[#2a2a2a] border-white/20 w-auto rounded-lg shadow-2xl"
                                        align="center"
                                        sideOffset={5}
                                    >
                                        <Calendar
                                            mode="single"
                                            selected={dob}
                                            onSelect={setDob}
                                            className="text-white rounded-lg"
                                            captionLayout="dropdown"
                                            fromYear={1940}
                                            toYear={2025}
                                        />
                                    </PopoverContent>
                                </Popover>
                            </Field>

                            {/* Phone number */}
                            <Field className="group">
                                <FieldLabel className="text-gray-400 text-xs font-normal flex items-center gap-2">
                                    Phone number
                                    <span className="text-orange-500 text-sm">*</span>
                                </FieldLabel>
                                <Input
                                    value={phoneNumber}
                                    onChange={(e) => setPhoneNumber(e.target.value)}
                                    className="h-11 bg-[#1a1a1a]/50 border border-white/5 rounded-lg text-white font-medium px-3 focus-visible:ring-2 focus-visible:ring-orange-500/50 focus-visible:border-orange-500/50 transition-all duration-200 hover:border-white/10"
                                    placeholder="Enter your phone number"
                                    required
                                />
                            </Field>

                            {/* Bio */}
                            <Field className="md:col-span-2 group">
                                <FieldLabel className="text-gray-400 text-xs font-normal flex items-center gap-2">
                                    Bio
                                    <span className="text-gray-600 text-xs">(Optional)</span>
                                </FieldLabel>
                                <Textarea
                                    value={bio}
                                    onChange={(e) => setBio(e.target.value)}
                                    className="min-h-[200px] bg-[#1a1a1a]/50 border border-white/5 rounded-lg text-white font-medium p-3 focus-visible:ring-2 focus-visible:ring-orange-500/50 focus-visible:border-orange-500/50 transition-all duration-200 hover:border-white/10 resize-none"
                                    placeholder="Tell us about yourself..."
                                />
                            </Field>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}

export default ProfilePage;
