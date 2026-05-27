import { Component, Input } from '@angular/core';


@Component({
    selector: 'app-glitch-text',
    standalone: true,
    imports: [],
    templateUrl: './glitch-text.component.html',
    styleUrl: './glitch-text.component.sass'
})
export class GlitchTextComponent {
    @Input() text: string = '';

    get letters(): string[] {
        return this.text.split('');
    }
}
