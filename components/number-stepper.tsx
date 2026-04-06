"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Minus, Plus } from "lucide-react";
import { cn } from "@/lib/utils";

interface NumberStepperProps {
    value: number;
    onChange: (value: number) => void;
    min?: number;
    max?: number;
    disabled?: boolean;
    className?: string;
}

export function NumberStepper({
    value,
    onChange,
    min = 1,
    max = 20,
    disabled = false,
    className,
}: NumberStepperProps) {
    const handleDecrement = () => {
        if (value > min) {
            onChange(value - 1);
        }
    };

    const handleIncrement = () => {
        if (value < max) {
            onChange(value + 1);
        }
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const inputValue = e.target.value;
        if (inputValue === "") {
            return;
        }
        const num = parseInt(inputValue, 10);
        if (!Number.isNaN(num)) {
            const clampedValue = Math.max(min, Math.min(max, num));
            onChange(clampedValue);
        }
    };

    const handleInputBlur = (e: React.FocusEvent<HTMLInputElement>) => {
        const inputValue = e.target.value;
        if (inputValue === "" || inputValue === "0") {
            onChange(min);
        }
    };

    return (
        <div className={cn("flex items-center", className)}>
            <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={handleDecrement}
                disabled={disabled || value <= min}
                className="h-12 w-12"
                aria-label="Decrease value"
            >
                <Minus className="h-5 w-5" />
            </Button>
            <Input
                type="number"
                min={min}
                max={max}
                value={value}
                onChange={handleInputChange}
                onBlur={handleInputBlur}
                disabled={disabled}
                className="h-12 w-24 px-3 py-2 mx-6 text-3xl font-bold tabular-nums text-center border-0 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                aria-label="Number of travelers"
            />
            <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={handleIncrement}
                disabled={disabled || value >= max}
                className="h-12 w-12"
                aria-label="Increase value"
            >
                <Plus className="h-5 w-5" />
            </Button>
        </div>
    );
}
