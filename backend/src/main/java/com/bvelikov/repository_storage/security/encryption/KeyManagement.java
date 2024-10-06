package com.bvelikov.repository_storage.security.encryption;

import javax.crypto.KeyGenerator;
import javax.crypto.SecretKey;
import javax.crypto.spec.SecretKeySpec;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Paths;
import java.security.NoSuchAlgorithmException;

/**
 * <p></>This class is used for key management for encryption.</p>
 *
 * <p>Currently, the class stores the key in a file called secret.key.
 * I decided to implement it this way for simplicity. In an actual
 * application, maybe a secure storage will be used (e.g. AWS Secret Manager,
 * Azure Key Vault, etc.).</p>
 */
public class KeyManagement {
    private static final String ALGORITHM = "AES";

    private static final String KEY_FILE_PATH = "secret.key";

    /**
     * A method that generates a key used for encryption and stores it in the file <i>secret.key</i>.
     *
     * @return The generated secret key
     */
    private static SecretKey generateAndStoreKey() {
        try {
            KeyGenerator keyGen = KeyGenerator.getInstance(ALGORITHM);
            keyGen.init(256);
            SecretKey secretKey = keyGen.generateKey();

            Files.write(Paths.get(KEY_FILE_PATH), secretKey.getEncoded());
            return secretKey;
        } catch (NoSuchAlgorithmException | IOException e) {
            throw new RuntimeException("Couldn't not generate and store key. Exception is: " + e.getMessage());
        }
    }

    /**
     * A method that reads the key stored in the file <i>secret.key</i>.
     *
     * @return The stored secret key
     */
    public static SecretKey getKey() {
        try {
            byte[] keyBytes = Files.readAllBytes(Paths.get(KEY_FILE_PATH));
            return new SecretKeySpec(keyBytes, "AES");
        } catch (IOException e) {
            return generateAndStoreKey();
        }
    }
}
