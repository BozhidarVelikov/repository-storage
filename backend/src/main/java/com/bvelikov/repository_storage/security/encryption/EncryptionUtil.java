package com.bvelikov.repository_storage.security.encryption;

import javax.crypto.Cipher;
import javax.crypto.SecretKey;
import javax.crypto.spec.IvParameterSpec;
import java.security.SecureRandom;
import java.util.Base64;

public class EncryptionUtil {
    private static final String ALGORITHM = "AES/CBC/PKCS5Padding";
    private static final int IV_SIZE = 16;

    private static final SecretKey SECRET_KEY = KeyManagement.getKey();

    public static String encrypt(String value) throws Exception {
        Cipher cipher = Cipher.getInstance(ALGORITHM);
        byte[] iv = new byte[IV_SIZE];
        SecureRandom random = new SecureRandom();
        random.nextBytes(iv);
        IvParameterSpec ivParams = new IvParameterSpec(iv);

        cipher.init(Cipher.ENCRYPT_MODE, SECRET_KEY, ivParams);
        byte[] encryptedValue = cipher.doFinal(value.getBytes());

        // Combine IV and encrypted value
        byte[] combined = new byte[IV_SIZE + encryptedValue.length];
        System.arraycopy(iv, 0, combined, 0, IV_SIZE);
        System.arraycopy(encryptedValue, 0, combined, IV_SIZE, encryptedValue.length);

        return Base64.getEncoder().encodeToString(combined);
    }

    public static String decrypt(String encryptedValue) throws Exception {
        byte[] decodedValue = Base64.getDecoder().decode(encryptedValue);
        byte[] iv = new byte[IV_SIZE];
        System.arraycopy(decodedValue, 0, iv, 0, IV_SIZE);
        byte[] cipherText = new byte[decodedValue.length - IV_SIZE];
        System.arraycopy(decodedValue, IV_SIZE, cipherText, 0, cipherText.length);

        Cipher cipher = Cipher.getInstance(ALGORITHM);
        IvParameterSpec ivParams = new IvParameterSpec(iv);
        cipher.init(Cipher.DECRYPT_MODE, SECRET_KEY, ivParams);
        byte[] decryptedValue = cipher.doFinal(cipherText);

        return new String(decryptedValue);
    }
}
