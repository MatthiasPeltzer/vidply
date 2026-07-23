export interface SelectOption {
    value: string;
    text: string;
    selected?: boolean;
}
export interface LabeledSelectOptions {
    classPrefix: string;
    labelClass: string;
    selectClass: string;
    labelText: string;
    selectId: string;
    hidden?: boolean;
    onChange?: (e: Event) => void;
    options?: SelectOption[];
}
export declare function createLabeledSelect({ classPrefix: _classPrefix, labelClass, selectClass, labelText, selectId, hidden, onChange, options }: LabeledSelectOptions): {
    label: HTMLLabelElement;
    select: HTMLSelectElement;
};
export declare function toggleLabeledSelect(label: HTMLElement | null, select: HTMLElement | null, show: boolean): void;
export declare function preventDragOnElement(element: HTMLElement | null): void;
//# sourceMappingURL=FormUtils.d.ts.map