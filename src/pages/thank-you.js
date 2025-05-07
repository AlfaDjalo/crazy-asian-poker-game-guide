import React from 'react';
import Layout from '@theme/Layout';
import Link from '@docusaurus/Link';
import styles from './thank-you.module.css'; // Optional custom styles

export default function ThankYou() {
  return (
    <Layout title="Thank You">
      <div className={styles.container}>
        <h1>Thank You!</h1>
        <p>Your message has been successfully sent.</p>
        <p>We’ll get back to you as soon as possible.</p>
        <Link to="/" className="button button--secondary">
          Return to Game Guide
        </Link>
      </div>
    </Layout>
  );
}

