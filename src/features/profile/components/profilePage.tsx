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
        <div className="w-full max-w-7xl mx-auto space-y-6">
            {/* Page Header */}
            <div className="space-y-2">
                <h1 className="text-4xl pb-8 font-bold text-white">Set up your Profile</h1>
            </div>

            {/* Two Column Layout */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Left Column - User Info Card */}
                <Card className="bg-[#2a2a2a]/95 backdrop-blur-xl border-white/20 shadow-2xl flex flex-col">
                    <CardContent className="text-center space-y-6 pt-12 pb-12 flex-1 flex flex-col">
                        <div>
                            <CardTitle className="text-3xl font-bold text-white mb-2">
                                {user?.username}
                            </CardTitle>
                        </div>
                        <div className="flex-1 flex items-center justify-center px-8">
                            <div className="relative w-full aspect-square max-w-md">
                                <Avatar className="w-full h-full border-8 border-[#3a3a3a]">
                                    <AvatarImage src={user?.avatarUrl} alt={user?.username} />
                                    <AvatarFallback className="bg-linear-to-br from-orange-500 to-orange-600 text-white text-9xl font-bold">
                                        {user?.username?.charAt(0).toUpperCase()}
                                    </AvatarFallback>
                                </Avatar>
                                <button className="absolute bottom-4 right-4 p-3 bg-orange-500 hover:bg-orange-600 rounded-full border-4 border-[#2a2a2a] transition-colors shadow-lg">
                                    <Camera className="h-5 w-5 text-white" />
                                </button>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Right Column - Bio & Details */}
                <Card className="bg-[#2a2a2a]/95 backdrop-blur-xl border-white/20 shadow-2xl flex flex-col">
                    <CardHeader className="flex flex-row items-center justify-between pb-4">
                        <div>
                            <CardTitle className="text-xl font-bold text-white">Bio & other details</CardTitle>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="flex gap-2">
                                <Button
                                    onClick={handleSave}
                                    disabled={isSaving}
                                    size="sm"
                                    className="bg-orange-500 hover:bg-orange-600 text-white"
                                >
                                    {isSaving ? 'Saving...' : 'Save profile'}
                                </Button>
                            </div>
                        </div>
                    </CardHeader>

                    <CardContent className="space-y-6">
                        {/* Two Column Grid for Fields */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

                            {/* Display Name */}
                            <Field>
                                <FieldLabel className="text-gray-400 text-xs font-normal">Display name</FieldLabel>
                                <Input
                                    value={displayName}
                                    onChange={(e) => setDisplayName(e.target.value)}
                                    className="h-10 bg-transparent border-none text-white font-medium p-0 focus-visible:ring-0 disabled:opacity-100"
                                    placeholder="Enter your display name"
                                    required
                                />
                            </Field>

                            {/* Gender */}
                            <Field>
                                <FieldLabel className="text-gray-400 text-xs font-normal">Gender</FieldLabel>
                                <Select value={gender} onValueChange={setGender}>
                                    <SelectTrigger className="h-10 bg-transparent border-none text-white font-medium px-0 focus:ring-0 w-full">
                                        <SelectValue placeholder="Select your gender" />
                                    </SelectTrigger>
                                    <SelectContent className="bg-[#2a2a2a] border-white/20">
                                        <SelectGroup>
                                            <SelectItem value="male" className="text-white focus:bg-white/10 focus:text-white">Male</SelectItem>
                                            <SelectItem value="female" className="text-white focus:bg-white/10 focus:text-white">Female</SelectItem>
                                            <SelectItem value="other" className="text-white focus:bg-white/10 focus:text-white">Other</SelectItem>
                                        </SelectGroup>
                                    </SelectContent>
                                </Select>
                            </Field>

                            {/* Date of Birth */}
                            <Field>
                                <FieldLabel className="text-gray-400 text-xs font-normal">Date of Birth</FieldLabel>
                                <Popover>
                                    <PopoverTrigger asChild>
                                        <Button
                                            variant="ghost"
                                            data-empty={!dob}
                                            className="h-10 w-full bg-transparent border-none text-white font-medium px-0 justify-start hover:bg-transparent data-[empty=true]:text-gray-500"
                                        >
                                            <CalendarIcon className="mr-2 h-4 w-4" />
                                            {dob ? format(dob, "PPP") : <span>Pick a date</span>}
                                        </Button>
                                    </PopoverTrigger>
                                    <PopoverContent
                                        className="p-0 bg-[#2a2a2a] border-white/20 w-auto"
                                        align="center"
                                        sideOffset={5}
                                    >
                                        <Calendar
                                            mode="single"
                                            selected={dob}
                                            onSelect={setDob}
                                            className="text-white"
                                            captionLayout="dropdown"
                                            fromYear={1940}
                                        />
                                    </PopoverContent>
                                </Popover>
                            </Field>

                            {/* Phone number */}
                            <Field>
                                <FieldLabel className="text-gray-400 text-xs font-normal">Phone number</FieldLabel>
                                <Input
                                    value={phoneNumber}
                                    onChange={(e) => setPhoneNumber(e.target.value)}
                                    className="h-10 bg-transparent border-none text-white font-medium p-0 focus-visible:ring-0 disabled:opacity-100"
                                    placeholder="Enter your phone number"
                                    required
                                />
                            </Field>

                            {/* Bio */}
                            <Field className="md:col-span-2">
                                <FieldLabel className="text-gray-400 text-xs font-normal">Bio</FieldLabel>
                                <Textarea
                                    value={bio}
                                    onChange={(e) => setBio(e.target.value)}
                                    className="min-h-[250px] bg-[#1a1a1a] border border-white/10 text-white font-medium p-3 focus-visible:ring-0 focus-visible:ring-offset-0 resize-none rounded-md"
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
