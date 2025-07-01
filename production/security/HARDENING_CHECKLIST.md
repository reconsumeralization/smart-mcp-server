# Security Hardening Checklist

- [ ] Configure WAF with OWASP Top 10 rule set.
- [ ] Implement DDoS protection (e.g., AWS Shield).
- [ ] Automate TLS certificate management (e.g., Let's Encrypt with cert-manager).
- [ ] Store all secrets in a dedicated secret manager (e.g., HashiCorp Vault, AWS Secrets Manager).
- [ ] Enforce strict network policies (Kubernetes Network Policies).
