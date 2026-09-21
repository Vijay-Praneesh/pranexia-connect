import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { ContactComponent } from './contact.component';
import { CONTACT_EMAIL } from './contact.model';
import {
  buildEmailSubject,
  buildEmailBody,
  buildGmailUrl,
  buildOutlookUrl,
  validateContactForm,
} from './contact.utils';

describe('Contact Us - Contact Form Email Provider Flow', () => {
  let component: ContactComponent;
  let fixture: ComponentFixture<ContactComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ContactComponent],
      providers: [provideRouter([])],
    }).compileComponents();

    fixture = TestBed.createComponent(ContactComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create the contact component', () => {
    expect(component).toBeTruthy();
    expect(component.formState).toBe('form');
  });

  describe('Pure Utility Functions & URL Generation', () => {
    it('TEST 12 (Subject): should generate correct email subject from full name', () => {
      const subject = buildEmailSubject('  Praneesh  ');
      expect(subject).toBe('New website enquiry from Praneesh');
    });

    it('TEST 13 (Body): should generate exact email body format with all fields', () => {
      const body = buildEmailBody({
        fullName: 'Praneesh',
        email: 'praneesh@example.com',
        phone: '+91 98765 43210',
        message: 'I would like to know more about Seyyon Connect.',
      });

      const expected = [
        'Hello Seyyon Connect Team,',
        '',
        'You have received a new website enquiry.',
        '',
        'Name: Praneesh',
        'Email: praneesh@example.com',
        'Phone: +91 98765 43210',
        '',
        'Message:',
        'I would like to know more about Seyyon Connect.',
        '',
        'Regards,',
        'Praneesh',
      ].join('\n');

      expect(body).toBe(expected);
    });

    it('TEST 13 (Body Fallback): should display "Not provided" when phone is empty', () => {
      const body = buildEmailBody({
        fullName: 'Praneesh',
        email: 'praneesh@example.com',
        phone: '',
        message: 'Hello team',
      });

      expect(body).toContain('Phone: Not provided');
    });

    it('TEST 14 & 15 & 27: should generate valid Gmail URL wrapped in Account Chooser with %20 space encoding', () => {
      const subject = 'New website enquiry from Praneesh & Co';
      const body = 'Hello Seyyon Connect Team,\nMessage with spaces & symbols #1?';
      const gmailUrl = buildGmailUrl(CONTACT_EMAIL, subject, body);

      expect(gmailUrl.startsWith('https://accounts.google.com/AccountChooser?service=mail&continue=')).toBeTrue();
      // Should not contain '+' for spaces in the target URL
      expect(gmailUrl.includes('+')).toBeFalse();
      expect(decodeURIComponent(gmailUrl)).toContain('https://mail.google.com/mail/?view=cm&fs=1');
      expect(decodeURIComponent(gmailUrl)).toContain(`to=${CONTACT_EMAIL}`);
    });

    it('TEST 16 & 27: should generate valid Outlook compose URL with %20 space encoding', () => {
      const subject = 'New website enquiry from Praneesh';
      const body = 'Hello Seyyon Connect Team,\nTest Message';
      const outlookUrl = buildOutlookUrl(CONTACT_EMAIL, subject, body);

      expect(outlookUrl.startsWith('https://outlook.office.com/mail/deeplink/compose?')).toBeTrue();
      expect(outlookUrl.includes('+')).toBeFalse();
      expect(outlookUrl).toContain(`to=${CONTACT_EMAIL}`);
      expect(outlookUrl).toContain('subject=New%20website%20enquiry%20from%20Praneesh');
    });
  });

  describe('Form Validation (Acceptance Tests 1 - 3)', () => {
    it('TEST 1: Submit empty form should return required errors for Full Name, Email, and Message', () => {
      const errors = validateContactForm({
        fullName: '',
        email: '',
        phone: '',
        message: '',
      });

      expect(errors.fullName).toBe('This field is required.');
      expect(errors.email).toBe('This field is required.');
      expect(errors.message).toBe('Please write a message.');
      expect(errors.phone).toBeUndefined();
    });

    it('TEST 2: Invalid email address should return invalid email message', () => {
      const errors = validateContactForm({
        fullName: 'Praneesh',
        email: 'invalid-email',
        phone: '',
        message: 'Valid message content',
      });

      expect(errors.fullName).toBeUndefined();
      expect(errors.email).toBe('Enter a valid email address.');
      expect(errors.message).toBeUndefined();
    });

    it('TEST 3: Phone empty should pass validation because phone is optional', () => {
      const errors = validateContactForm({
        fullName: 'Praneesh',
        email: 'praneesh@example.com',
        phone: '',
        message: 'Valid message content',
      });

      expect(Object.keys(errors).length).toBe(0);
    });
  });

  describe('Interactive Component Flow (Acceptance Tests 4 - 12)', () => {
    it('TEST 4: Valid form submission transitions to provider-selection state', () => {
      component.formData = {
        fullName: 'Praneesh',
        email: 'praneesh@example.com',
        phone: '+91 98765 43210',
        message: 'I would like to know more about Seyyon Connect.',
        website: '',
      };

      component.onSubmitInquiry();

      expect(component.formState).toBe('provider-selection');
      expect(Object.keys(component.errors).length).toBe(0);
    });

    it('TEST 5: Click Back to form restores original form with all entered values preserved', () => {
      component.formData = {
        fullName: 'Praneesh',
        email: 'praneesh@example.com',
        phone: '+91 98765 43210',
        message: 'I would like to know more about Seyyon Connect.',
        website: '',
      };

      component.onSubmitInquiry();
      expect(component.formState).toBe('provider-selection');

      // User clicks Back to form
      component.backToForm();

      expect(component.formState).toBe('form');
      expect(component.formData.fullName).toBe('Praneesh');
      expect(component.formData.email).toBe('praneesh@example.com');
      expect(component.formData.phone).toBe('+91 98765 43210');
      expect(component.formData.message).toBe('I would like to know more about Seyyon Connect.');
    });

    it('TEST 6 & 8: Selecting Gmail opens new tab and transitions to confirmation state', () => {
      spyOn(window, 'open');

      component.formData = {
        fullName: 'Praneesh',
        email: 'praneesh@example.com',
        phone: '+91 98765 43210',
        message: 'I would like to know more about Seyyon Connect.',
        website: '',
      };
      component.formState = 'provider-selection';

      component.selectProvider('gmail');

      expect(window.open).toHaveBeenCalledWith(
        jasmine.stringMatching(/https:\/\/accounts\.google\.com\/AccountChooser/),
        '_blank',
        'noopener,noreferrer'
      );
      expect(component.formState).toBe('confirmation');
      expect(component.selectedProvider).toBe('gmail');
    });

    it('TEST 7 & 9: Selecting Outlook opens new tab and transitions to confirmation state', () => {
      spyOn(window, 'open');

      component.formData = {
        fullName: 'Praneesh',
        email: 'praneesh@example.com',
        phone: '+91 98765 43210',
        message: 'I would like to know more about Seyyon Connect.',
        website: '',
      };
      component.formState = 'provider-selection';

      component.selectProvider('outlook');

      expect(window.open).toHaveBeenCalledWith(
        jasmine.stringMatching(/https:\/\/outlook\.office\.com\/mail\/deeplink\/compose/),
        '_blank',
        'noopener,noreferrer'
      );
      expect(component.formState).toBe('confirmation');
      expect(component.selectedProvider).toBe('outlook');
    });

    it('TEST 10: Prepare another enquiry resets form, validation, and returns to form state', () => {
      component.formData = {
        fullName: 'Praneesh',
        email: 'praneesh@example.com',
        phone: '+91 98765 43210',
        message: 'I would like to know more about Seyyon Connect.',
        website: '',
      };
      component.formState = 'confirmation';
      component.selectedProvider = 'gmail';

      component.prepareAnotherEnquiry();

      expect(component.formState).toBe('form');
      expect(component.selectedProvider).toBeNull();
      expect(component.formData.fullName).toBe('');
      expect(component.formData.email).toBe('');
      expect(component.formData.phone).toBe('');
      expect(component.formData.message).toBe('');
      expect(component.formData.website).toBe('');
      expect(Object.keys(component.errors).length).toBe(0);
    });

    it('TEST 11: Honeypot field filled silences form submission completely (bot protection)', () => {
      component.formData = {
        fullName: 'Spam Bot',
        email: 'bot@spam.com',
        phone: '123456',
        message: 'Spam message',
        website: 'http://spam-link.com', // Honeypot filled
      };

      component.onSubmitInquiry();

      expect(component.formState).toBe('form'); // Remains on form, no provider selection
    });

    it('TEST 12: Duplicate submission protection prevents double triggers', () => {
      component.formData = {
        fullName: 'Praneesh',
        email: 'praneesh@example.com',
        phone: '',
        message: 'Test message',
        website: '',
      };

      component.isSubmitting = true; // Lock active
      component.onSubmitInquiry();

      // Does not transition when locked
      expect(component.formState).toBe('form');
    });
  });
});
