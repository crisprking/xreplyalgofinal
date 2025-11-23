import { useEffect, useRef, useState } from 'react';

interface AutoSaveOptions {
    key: string;
    delay?: number;
    onSave?: (data: any) => void;
}

export function useAutoSave<T>(data: T, options: AutoSaveOptions) {
    const { key, delay = 1000, onSave } = options;
    const [lastSaved, setLastSaved] = useState<Date | null>(null);
    const [isSaving, setIsSaving] = useState(false);
    const timeoutRef = useRef<NodeJS.Timeout>();

    useEffect(() => {
        // Clear existing timeout
        if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
        }

        // Set new timeout
        timeoutRef.current = setTimeout(() => {
            setIsSaving(true);
            try {
                localStorage.setItem(key, JSON.stringify(data));
                setLastSaved(new Date());
                onSave?.(data);
            } catch (error) {
                console.error('Auto-save failed:', error);
            } finally {
                setIsSaving(false);
            }
        }, delay);

        return () => {
            if (timeoutRef.current) {
                clearTimeout(timeoutRef.current);
            }
        };
    }, [data, key, delay, onSave]);

    const loadSaved = (): T | null => {
        try {
            const saved = localStorage.getItem(key);
            return saved ? JSON.parse(saved) : null;
        } catch {
            return null;
        }
    };

    const clearSaved = () => {
        localStorage.removeItem(key);
        setLastSaved(null);
    };

    return { lastSaved, isSaving, loadSaved, clearSaved };
}
