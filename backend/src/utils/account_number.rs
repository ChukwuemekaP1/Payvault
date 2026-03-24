//! Account number generation utility.
//!
//! Generates random 10-digit numeric account numbers in the format used
//! by Nigerian banks (e.g. NUBAN — Nigerian Uniform Bank Account Number).
//! Each digit is independently sampled from a uniform distribution over
//! [0, 9] using the `rand` crate's thread-local RNG.

use rand::Rng;

/// Generates a random 10-digit numeric account number.
///
/// Each of the 10 digits is drawn independently via `rng.gen_range(0..=9)`,
/// converted to a char, and collected into a `String`.
///
/// No uniqueness guarantee is provided at this layer — the `wallets` table
/// enforces uniqueness via a UNIQUE constraint on `account_number`, so the
/// caller must handle the (astronomically rare) collision at the DB level.
pub fn generate_account_number() -> String {
    let mut rng = rand::thread_rng();
    // Generate exactly 10 digits — matches the Nigerian NUBAN account number length.
    (0..10).map(|_| rng.gen_range(0..=9).to_string()).collect()
}

#[cfg(test)]
mod tests {
    use super::*;

    /// Verifies the output is always exactly 10 characters long.
    #[test]
    fn test_account_number_length() {
        let account_number = generate_account_number();
        assert_eq!(account_number.len(), 10);
    }

    /// Verifies every character in the output is an ASCII digit (0–9).
    #[test]
    fn test_account_number_numeric() {
        let account_number = generate_account_number();
        assert!(account_number.chars().all(|c| c.is_numeric()));
    }
}
