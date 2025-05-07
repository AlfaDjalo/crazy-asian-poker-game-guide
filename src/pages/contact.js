import React from 'react';
import Layout from '@theme/Layout';
import Link from '@docusaurus/Link';
import '../css/contact.css'; // Custom styles for the contact page

export default function Contact() {
  return (
    <Layout title="Contact Us">
      <div className="contact-container">
        <h1>Contact Us</h1>
        <p>All feedback welcome!</p>
        <p>
          Whether it's suggestions for new games, questions about the rules, or issues with the game guide.
        </p>
        <form action="https://formsubmit.co/sign.up.david.c@gmail.com" method="POST">
          <input type="hidden" name="_captcha" value="false" />
          <input
            type="hidden"
            name="_next"
            value="https://AlfaDjalo.github.io/crazy-asian-poker-game-guide/thank-you"
          />

          <div className="form-group">
            <label htmlFor="name">Name:</label>
            <input type="text" id="name" name="name" />
          </div>

          <div className="form-group">
            <label htmlFor="email">Email:</label>
            <input type="email" id="email" name="email" />
          </div>

          <div className="form-group">
            <label htmlFor="message">Message:</label>
            <textarea id="message" name="message" rows="5" required></textarea>
          </div>

          <div className="button-group">
            <button type="submit" className="button button--primary">
              Send Message
            </button>
            <Link to="/" className="button button--secondary">
              Return to Game Guide
            </Link>
          </div>
        </form>
      </div>
    </Layout>
  );
};
