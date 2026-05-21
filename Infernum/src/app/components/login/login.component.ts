import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { CyberButtonComponent } from '../shared/cyber-button/cyber-button.component';
import { GlitchTextComponent } from '../shared/glitch-text/glitch-text.component';

@Component({
    selector: 'app-login',
    imports: [CommonModule, ReactiveFormsModule, RouterModule, CyberButtonComponent, GlitchTextComponent],
    templateUrl: './login.component.html',
    styleUrl: './login.component.sass'
})
export class LoginComponent implements OnInit {
    loginForm!: FormGroup;
    errorMessage: string = '';
    isLoading: boolean = false;

    constructor(
        private fb: FormBuilder,
        private authService: AuthService,
        public router: Router
    ) { }

    ngOnInit(): void {
        if (this.authService.isAuthenticated()) {
            this.router.navigate(['/home']);
        }

        this.loginForm = this.fb.group({
            email: ['', [Validators.required, Validators.email]],
            password: ['', [Validators.required, Validators.minLength(6)]]
        });
    }

    async onSubmit(): Promise<void> {
        if (this.loginForm.invalid) {
            this.errorMessage = 'Please fill in all fields correctly';
            return;
        }

        this.isLoading = true;
        this.errorMessage = '';

        const result = await this.authService.login(this.loginForm.value);

        this.isLoading = false;

        if (result.success) {
            this.router.navigate(['/home']);
        } else {
            this.errorMessage = result.message;
        }
    }

    get email() {
        return this.loginForm.get('email');
    }

    get password() {
        return this.loginForm.get('password');
    }
}
