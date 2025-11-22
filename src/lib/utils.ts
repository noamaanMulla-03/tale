import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import { toast } from "sonner"

export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs))
}

export const toastConfig = {
    position: "top-center" as const,
    richColors: true,
    closeButton: true,
    theme: "dark" as const,
    toastOptions: {
        style: {
            background: 'hsl(0 0% 16.5% / 0.95)',
            border: '1px solid rgba(255, 255, 255, 0.2)',
            color: 'rgb(255, 255, 255)',
            backdropFilter: 'blur(12px)',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
            borderRadius: '0.5rem',
        },
        className: 'font-medium',
        descriptionClassName: 'text-gray-400 text-sm',
    },
    success: {
        style: {
            background: 'hsl(0 0% 16.5% / 0.95)',
            border: '2px solid rgb(249 115 22 / 0.5)',
            color: 'rgb(255, 255, 255)',
        },
        iconTheme: {
            primary: 'rgb(249 115 22)',
            secondary: 'white',
        },
    },
    error: {
        style: {
            background: 'hsl(0 0% 16.5% / 0.95)',
            border: '2px solid rgb(239 68 68 / 0.5)',
            color: 'rgb(255, 255, 255)',
        },
        iconTheme: {
            primary: 'rgb(239 68 68)',
            secondary: 'white',
        },
    },
};

export const toastSuccess = (title: string, description?: string) => 
    toast.success(title, { description });

export const toastError = (title: string, description?: string) => 
    toast.error(title, { description });

export const toastInfo = (title: string, description?: string) => 
    toast.info(title, { description });

export const toastWarning = (title: string, description?: string) => 
    toast.warning(title, { description });