import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
    selector: 'app-glitch-text',
    standalone: true,
    imports: [CommonModule],
    templateUrl: './glitch-text.component.html',
    styleUrl: './glitch-text.component.sass'
})
export class GlitchTextComponent {
    @Input() text: string = '';

    get letters(): string[] {
        return this.text.split('');
    }
}
