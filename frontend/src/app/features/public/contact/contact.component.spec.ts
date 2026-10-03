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

describe('Seyyon Connect Contact Us — Free Email Draft Flow', () => {
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

  it('should create the contact component and default to form state', () => {
    expect(component).toBeTruthy();
    expect(component.formState).toBe('form');
  });

  describe('Pure Utility Functions & URL Generation (Section 11, 12, 13, 14, 16, 32)', () => {
    it('should generate correct email subject from user subject or fallback to trimmed full name', () => {
      const subjectCustom = buildEmailSubject('  Broadcast Plan Inquiry  ', 'Praneesh');
      expect(subjectCustom).toBe('Broadcast Plan Inquiry');

      const subjectFallback = buildEmailSubject('', '  Praneesh  ');
      expect(subjectFallback).toBe('New website enquiry from Praneesh');
    });

    it('should generate exact email body format matching specification with subject', () => {
      const body = buildEmailBody({
        fullName: 'Praneesh',
        email: 'praneesh@example.com',
        phone: '+91 98765 43210',
        subject: 'Enterprise Plan Demo',
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
        'Subject: Enterprise Plan Demo',
        '',
        'Message:',
        'I would like to know more about Seyyon Connect.',
        '',
        'Regards,',
        'Praneesh',
      ].join('\n');

      expect(body).toBe(expected);
    });

    it('should display "Not provided" in body when phone number is not supplied', () => {
      const body = buildEmailBody({
        fullName: 'Praneesh',
        email: 'praneesh@example.com',
        phone: '',
        subject: 'Quick Question',
        message: 'Hello team',
      });

      expect(body).toContain('Phone: Not provided');
    });

    it('should generate valid Gmail URL wrapped in Account Chooser with %20 space encoding', () => {
      const subject = 'New website enquiry from Praneesh & Co';
      const body = 'Hello Seyyon Connect Team,\nMessage with spaces & symbols + ? # % \' " unicode 🚀';
      const gmailUrl = buildGmailUrl(CONTACT_EMAIL, subject, body);

      expect(gmailUrl.startsWith('https://accounts.google.com/AccountChooser?service=mail&continue=')).toBeTrue();
      // Should not contain '+' for spaces in query string
      expect(gmailUrl.includes('+')).toBeFalse();
      expect(decodeURIComponent(gmailUrl)).toContain('https://mail.google.com/mail/?view=cm&fs=1');
      expect(decodeURIComponent(gmailUrl)).toContain(`to=${CONTACT_EMAIL}`);
    });

    it('should generate valid Outlook compose URL with %20 space encoding', () => {
      const subject = 'New website enquiry from Praneesh';
      const body = 'Hello Seyyon Connect Team,\nMessage with spaces + & symbols';
      const outlookUrl = buildOutlookUrl(CONTACT_EMAIL, subject, body);

      expect(outlookUrl.startsWith('https://outlook.office.com/mail/deeplink/compose?')).toBeTrue();
      expect(outlookUrl.includes('+')).toBeFalse();
      expect(outlookUrl).toContain(`to=${CONTACT_EMAIL}`);
      expect(outlookUrl).toContain('subject=New%20website%20enquiry%20from%20Praneesh');
    });
  });

  describe('Form Validation', () => {
    it('Submit empty form should return required errors for Full Name, Email, Subject, and Message', () => {
      const errors = validateContactForm({
        fullName: '',
        email: '',
        phone: '',
        subject: '',
        message: '',
      });

      expect(errors.fullName).toBe('This field is required.');
      expect(errors.email).toBe('This field is required.');
      expect(errors.subject).toBe('Please enter a subject.');
      expect(errors.message).toBe('Please write a message.');
      expect(errors.phone).toBeUndefined();
    });

    it('Invalid email format should return "Enter a valid email address."', () => {
      const errors = validateContactForm({
        fullName: 'Praneesh',
        email: 'abc',
        phone: '',
        subject: 'Inquiry',
        message: 'Valid message content',
      });

      expect(errors.fullName).toBeUndefined();
      expect(errors.email).toBe('Enter a valid email address.');
      expect(errors.message).toBeUndefined();
    });

    it('should pass validation when optional phone number is omitted', () => {
      const errors = validateContactForm({
        fullName: 'Praneesh',
        email: 'praneesh@example.com',
        phone: '',
        subject: 'General Question',
        message: 'Valid message content',
      });

      expect(Object.keys(errors).length).toBe(0);
    });
  });

  describe('Interactive User Flow', () => {
    it('Valid form submission displays provider selection (Gmail, Outlook, Back to form)', () => {
      component.formData = {
        fullName: 'Praneesh',
        email: 'praneesh@example.com',
        phone: '+91 98765 43210',
        subject: 'Enterprise WhatsApp Solution',
        message: 'I would like to know more about Seyyon Connect.',
        website: '',
      };

      component.onSubmitInquiry();

      expect(component.formState).toBe('provider-selection');
      expect(Object.keys(component.errors).length).toBe(0);
    });

    it('Clicking "Back to form" preserves all previously entered data', () => {
      component.formData = {
        fullName: 'Praneesh',
        email: 'praneesh@example.com',
        phone: '+91 98765 43210',
        subject: 'Enterprise WhatsApp Solution',
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
      expect(component.formData.subject).toBe('Enterprise WhatsApp Solution');
      expect(component.formData.message).toBe('I would like to know more about Seyyon Connect.');
    });

    it('Clicking "Gmail" opens new tab and shows "Draft prepared." confirmation', () => {
      spyOn(window, 'open');

      component.formData = {
        fullName: 'Praneesh',
        email: 'praneesh@example.com',
        phone: '+91 98765 43210',
        subject: 'Broadcast Demo',
        message: 'I would like to know more about Seyyon Connect.',
        website: '',
      };
      component.formState = 'provider-selection';

      component.openGmail();

      expect(window.open).toHaveBeenCalledWith(
        jasmine.stringMatching(/https:\/\/accounts\.google\.com\/AccountChooser/),
        '_blank',
        'noopener,noreferrer'
      );
      expect(component.formState).toBe('confirmation');
      expect(component.selectedProvider).toBe('gmail');
    });

    it('Clicking "Outlook" opens new tab and shows "Draft prepared." confirmation', () => {
      spyOn(window, 'open');

      component.formData = {
        fullName: 'Praneesh',
        email: 'praneesh@example.com',
        phone: '+91 98765 43210',
        subject: 'Broadcast Demo',
        message: 'I would like to know more about Seyyon Connect.',
        website: '',
      };
      component.formState = 'provider-selection';

      component.openOutlook();

      expect(window.open).toHaveBeenCalledWith(
        jasmine.stringMatching(/https:\/\/outlook\.office\.com\/mail\/deeplink\/compose/),
        '_blank',
        'noopener,noreferrer'
      );
      expect(component.formState).toBe('confirmation');
      expect(component.selectedProvider).toBe('outlook');
    });

    it('Clicking "Prepare another enquiry" resets all fields, clears errors, returns to form state, and focuses Full Name', () => {
      component.formData = {
        fullName: 'Praneesh',
        email: 'praneesh@example.com',
        phone: '+91 98765 43210',
        subject: 'Demo',
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
      expect(component.formData.subject).toBe('');
      expect(component.formData.message).toBe('');
      expect(component.formData.website).toBe('');
      expect(Object.keys(component.errors).length).toBe(0);
    });

    it('Honeypot field filled silences form submission completely (bot protection)', () => {
      component.formData = {
        fullName: 'Spam Bot',
        email: 'bot@spam.com',
        phone: '123456',
        subject: 'Spam',
        message: 'Spam message',
        website: 'http://spam-link.com', // Honeypot filled
      };

      component.onSubmitInquiry();

      expect(component.formState).toBe('form'); // Remains on form, no provider selection
    });

    it('Duplicate submission protection prevents double triggers', () => {
      component.formData = {
        fullName: 'Praneesh',
        email: 'praneesh@example.com',
        phone: '',
        subject: 'Demo',
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
