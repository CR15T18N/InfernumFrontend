import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, AbstractControl, ValidationErrors } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { CyberButtonComponent } from '../shared/cyber-button/cyber-button.component';
import { GlitchTextComponent } from '../shared/glitch-text/glitch-text.component';

@Component({
    selector: 'app-register',
    imports: [CommonModule, ReactiveFormsModule, RouterModule, CyberButtonComponent, GlitchTextComponent],
    templateUrl: './register.component.html',
    styleUrl: './register.component.sass'
})
export class RegisterComponent implements OnInit {
    registerForm!: FormGroup;
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

        this.registerForm = this.fb.group({
            username: ['', [Validators.required, Validators.minLength(3)]],
            email: ['', [Validators.required, Validators.email]],
            password: ['', [Validators.required, Validators.minLength(6)]],
            confirmPassword: ['', [Validators.required]]
        }, { validators: this.passwordMatchValidator });
    }

    passwordMatchValidator(control: AbstractControl): ValidationErrors | null {
        const password = control.get('password');
        const confirmPassword = control.get('confirmPassword');

        if (!password || !confirmPassword) {
            return null;
        }

        return password.value === confirmPassword.value ? null : { passwordMismatch: true };
    }

    async onSubmit(): Promise<void> {
        if (this.registerForm.invalid) {
            this.errorMessage = 'Please fill in all fields correctly';
            return;
        }

        this.isLoading = true;
        this.errorMessage = '';

        const { username, email, password } = this.registerForm.value;
        const result = await this.authService.register({ username, email, password });

        this.isLoading = false;

        if (result.success) {
            this.router.navigate(['/home']);
        } else {
            this.errorMessage = result.message;
        }
    }

    get username() {
        return this.registerForm.get('username');
    }

    get email() {
        return this.registerForm.get('email');
    }

    get password() {
        return this.registerForm.get('password');
    }

    get confirmPassword() {
        return this.registerForm.get('confirmPassword');
    }

    get passwordMismatch() {
        return this.registerForm.errors?.['passwordMismatch'] &&
            this.confirmPassword?.touched;
    }
}
