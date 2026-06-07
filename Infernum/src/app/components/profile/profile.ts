import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink, ActivatedRoute } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { GameService } from '../../services/game.service';
import { CartService } from '../../services/cart.service';
import { User, Game } from '../../models/user.model';
import { GlitchTextComponent } from '../shared/glitch-text/glitch-text.component';
import { CyberButtonComponent } from '../shared/cyber-button/cyber-button.component';
import { NavbarComponent } from '../shared/navbar/navbar.component';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [FormsModule, RouterLink, GlitchTextComponent, CyberButtonComponent, NavbarComponent],
  templateUrl: './profile.html',
  styleUrl: './profile.sass',
})
export class ProfileComponent implements OnInit {
  currentUser: User | null = null;
  isEditMode = false;
  isLoading = false;
  message = '';
  messageType: 'success' | 'error' = 'success';

  purchasedGames: Game[] = [];
  private libraryLoaded = false;
  selectedFile: File | null = null;

  editData = {
    displayName: '',
    bio: '',
    profilePicture: ''
  };

  constructor(
    private authService: AuthService,
    private gameService: GameService,
    private cartService: CartService,
    private router: Router,
    private route: ActivatedRoute,
    private cdr: ChangeDetectorRef
  ) { }

  ngOnInit() {
    this.authService.currentUser.subscribe(u => {
      this.currentUser = u;
      if (u) {
        this.editData = {
          displayName: u.displayName || u.username || '',
          bio: u.bio || '',
          profilePicture: u.profilePicture || ''
        };
        if (!this.libraryLoaded) {
          this.libraryLoaded = true;
          this.loadLibrary();
        }
      } else {
        this.router.navigate(['/login']);
      }
    });

    this.authService.fetchProfile().catch(err => console.error(err));

    // Handle payment feedback from Stripe redirect
    const paymentStatus = this.route.snapshot.queryParamMap.get('payment');
    const checkoutId = this.route.snapshot.queryParamMap.get('checkout_id');
    if (paymentStatus === 'success') {
      if (checkoutId) {
        this.cartService.verifyPayment(checkoutId).then(res => {
          if (res.success) {
            this.showMessage('Purchase successful! The game has been added to your library.', 'success');
          } else {
            this.showMessage('Payment verification in progress... Please refresh in a moment.', 'success');
          }
          this.loadLibrary();
        }).catch(err => {
          console.error('Payment verification error:', err);
          this.loadLibrary();
        });
      } else {
        this.showMessage('Purchase successful! The game has been added to your library.', 'success');
        this.loadLibrary();
      }
      this.router.navigate([], {
        relativeTo: this.route,
        queryParams: { payment: null, checkout_id: null },
        queryParamsHandling: 'merge'
      });
    } else if (paymentStatus === 'cancel') {
      this.showMessage('Purchase was cancelled.', 'error');
      this.router.navigate([], {
        relativeTo: this.route,
        queryParams: { payment: null, checkout_id: null },
        queryParamsHandling: 'merge'
      });
    }
  }

  private async loadLibrary() {
    if (!this.currentUser?.id) return;
    try {
      this.purchasedGames = await this.gameService.getLibrary();
    } catch (e) {
      console.error('Error loading library:', e);
      this.purchasedGames = [];
    } finally {
      this.cdr.detectChanges();
    }
  }

  get displayName(): string {
    return this.currentUser?.displayName || this.currentUser?.username || 'User';
  }

  get joinDate(): string {
    if (!this.currentUser?.createdAt) return '';
    const date = new Date(this.currentUser.createdAt);
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  }

  get purchasedCount(): number {
    return this.purchasedGames.length;
  }

  toggleEditMode() {
    this.isEditMode = !this.isEditMode;
    this.message = '';
    this.selectedFile = null;
    if (this.isEditMode && this.currentUser) {
      this.editData = {
        displayName: this.currentUser.displayName || this.currentUser.username || '',
        bio: this.currentUser.bio || '',
        profilePicture: this.currentUser.profilePicture || ''
      };
    }
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files[0]) {
      const file = input.files[0];

      if (!file.type.startsWith('image/')) {
        this.showMessage('Please select a valid image', 'error');
        return;
      }

      if (file.size > 2 * 1024 * 1024) {
        this.showMessage('Image must be smaller than 2MB', 'error');
        return;
      }

      this.selectedFile = file;

      const reader = new FileReader();
      reader.onload = (e) => {
        this.editData.profilePicture = e.target?.result as string;
      };
      reader.readAsDataURL(file);
    }
  }

  async saveProfile(): Promise<void> {
    if (!this.currentUser) return;

    this.isLoading = true;
    this.message = '';

    try {
      const result = await this.authService.updateProfile({
        displayName: this.editData.displayName,
        bio: this.editData.bio,
        profilePicture: this.selectedFile || this.editData.profilePicture
      });

      if (result.success) {
        this.showMessage(result.message, 'success');
        this.isEditMode = false;
        this.selectedFile = null;
      } else {
        this.showMessage(result.message, 'error');
      }
    } catch (error) {
      this.showMessage('Error saving profile', 'error');
    } finally {
      this.isLoading = false;
      this.cdr.detectChanges();
    }
  }

  cancelEdit() {
    this.isEditMode = false;
    this.message = '';
    this.selectedFile = null;
    if (this.currentUser) {
      this.editData = {
        displayName: this.currentUser.displayName || this.currentUser.username || '',
        bio: this.currentUser.bio || '',
        profilePicture: this.currentUser.profilePicture || ''
      };
    }
  }

  private showMessage(msg: string, type: 'success' | 'error'): void {
    this.message = msg;
    this.messageType = type;
    setTimeout(() => {
      this.message = '';
    }, 5000);
  }

  getProfilePicture(): string {
    return this.currentUser?.profilePicture || this.getDefaultAvatar();
  }

  getEditProfilePicture(): string {
    return this.editData.profilePicture || this.getDefaultAvatar();
  }

  private getDefaultAvatar(): string {
    const char = (this.currentUser?.username || 'U').charAt(0).toUpperCase();
    return `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='200'%3E%3Crect fill='%2300ffff' width='200' height='200'/%3E%3Ctext fill='%23131313' font-size='100' font-family='Arial' x='50%25' y='50%25' text-anchor='middle' dy='.3em'%3E${char}%3C/text%3E%3C/svg%3E`;
  }
}
