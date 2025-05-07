import React from 'react';
import Layout from '@theme/Layout';
import styles from './thank-you.module.css'; // Optional custom styles

export default function ThankYou() {
  return (
    <Layout title="Thank You">
      <div className={styles.container}>
        <h1>Thank You!</h1>
        <p>Your message has been successfully sent.</p>
        <p>We’ll get back to you as soon as possible.</p>
        <a className={styles.button} href="/">Back to Home</a>
      </div>
    </Layout>
  );
}
