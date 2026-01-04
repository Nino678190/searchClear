function storePassword(password) {
    browser.storage.local.set({ masterPassword: password });
}

async function checkPassword(storedPassword, inputPassword) {
    inputPassword = inputPassword.trim();
    inputPassword = await hashPassword(inputPassword);
    return storedPassword === inputPassword;
}

async function hashPassword(password) {
    const passwordBytes = new TextEncoder().encode(password);
    const hash = await crypto.subtle.digest('SHA-256', passwordBytes);
    return btoa(String.fromCharCode(...new Uint8Array(hash)));
}

async function saveMasterpassword(newPassword, currentPassword) {
    const result = await browser.storage.local.get('masterPassword');
    const storedPassword = result.masterPassword;

    if (!storedPassword){
        const hashedNewPassword = await hashPassword(newPassword.trim());
        storePassword(hashedNewPassword);
        return { success: true, message: 'Master password set successfully.' };
    }
    const isMatch = await checkPassword(storedPassword, currentPassword);
    if (isMatch) {
        const hashedNewPassword = await hashPassword(newPassword.trim());
        await storePassword(hashedNewPassword);
        return { success: true, message: 'Master password updated successfully.' };
    } else {
        return { success: false, message: 'Current master password is incorrect.' };
    }
}

async function addBlockedWords(words) {
    const result = await browser.storage.local.get("blockedWords");
    let blockedWords = result.blockedWords || [];
    const newWords = words
        .split(",")
        .map((word) => word.trim())
        .filter((word) => word.length > 0);

    // Use a Set to ensure all words in the list are unique
    const uniqueWords = new Set([...blockedWords, ...newWords]);
    blockedWords = Array.from(uniqueWords);

    await browser.storage.local.set({ blockedWords: blockedWords });
    console.log("Updated blocked words:", blockedWords);
    return { success: true, message: "Blocked words added successfully." };
}

async function getBlockedWords() {
    const result = await browser.storage.local.get("blockedWords");
    return result.blockedWords || [];
}

async function editWords(words, password) {
    const result = await browser.storage.local.get("masterPassword");
    const storedPassword = result.masterPassword;
    const isMatch = await checkPassword(
        storedPassword,
        await hashPassword(password)
    );
    if (!isMatch) {
        throw new Error("Incorrect password");
    }
    await browser.storage.local.set({ blockedWords: words });
}


browser.webRequest.onBeforeRequest.addListener(
    async function(details) {
        const blockedWords = await getBlockedWords();
        if (!blockedWords || blockedWords.length === 0) {
            return {};
        }

        const url = new URL(details.url);
        const searchParams = url.searchParams;
        const queryParam = "q";

        if (searchParams.has(queryParam)) {
            let query = searchParams.get(queryParam);
            let originalQuery = query;

            blockedWords.forEach((word) => {
                const regex = new RegExp(`\\b${word}\\b`, "gi");
                query = query.replace(regex, "");
            });

            query = query.replace(/\s+/g, ' ').trim();

            if (query !== originalQuery) {
                searchParams.set(queryParam, query);
                return { redirectUrl: url.toString() };
            }
        }
        return {};
    },
    {
        urls: [
            "*://*.google.com/search*",
            "*://*.bing.com/search*",
            "*://*.duckduckgo.com/*",
            "*://*.yahoo.com/search*",
            "*://*.baidu.com/s*",
            "*://*.yandex.com/search*"
        ],
        types: ["main_frame"]
    },
    ["blocking"]
);

browser.runtime.onMessage.addListener((message) => {
    if (message.action === 'saveMasterpassword') {
        return saveMasterpassword(message.masterpassword, message.currentMasterpassword);
    } else if (message.action === 'checkPassword') {
        return browser.storage.local.get('masterPassword').then((result) => {
            return checkPassword(result.masterPassword, message.password);
        });
    } else if (message.action === 'addBlockedWords'){
        addBlockedWords(message.newBlockedWords);
        return { success: true, message: "Blocked words added successfully." };
    } else if (message.action === 'getBlockedWords'){
        return getBlockedWords().then(words => ({ blockedWords: words }));
    } else if (message.action === 'editWords'){
        return editWords(message.words, message.password).then(() => {
            return { success: true, message: 'Blocked words updated successfully.' };
        }).catch(() => {
            return { success: false, message: 'Failed to update blocked words. Incorrect password?' };
        });
    }
});


