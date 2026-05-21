import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { GlitchTextComponent } from '../glitch-text/glitch-text.component';

@Component({
    selector: 'app-cyber-button',
    imports: [CommonModule, GlitchTextComponent],
    templateUrl: './cyber-button.component.html',
    styleUrl: './cyber-button.component.sass'
})
export class CyberButtonComponent {
    @Input() label: string = 'Button';
    @Input() kbd: string = '';
    @Input() ariaLabel: string = '';
    @Input() type: 'button' | 'submit' = 'button';
    @Input() disabled: boolean = false;
    @Output() clicked = new EventEmitter<void>();

    onClick(): void {
        if (!this.disabled) {
            this.clicked.emit();
        }
    }
}
