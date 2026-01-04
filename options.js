function edit() {
    const dialog = document.createElement("dialog");
    dialog.id = "editDialog";
    dialog.innerHTML = `
                <h2>Edit Banned Words</h2>
                <textarea id="editBlockedWords" rows="10" cols="30"></textarea><br>
                <input type="password" id="editMasterpassword" placeholder="Masterpassword"><br>
                <button id="saveEditedBlockedWords">Save</button>
                <button id="cancelEdit">Cancel</button>
            `;
    document.body.appendChild(dialog);
    dialog.showModal();

    document.getElementById("cancelEdit").addEventListener("click", () => {
        dialog.close();
        dialog.remove();
    });

    document.getElementById("saveEditedBlockedWords").addEventListener("click", saveEditedBlockedWords);
}

function saveMasterpassword() {
    const passwordInput = document.getElementById("masterpassword").value;
    const currentPasswordInput = document.getElementById(
        "currentMasterpassword"
    ).value;
    browser.runtime
        .sendMessage({
            action: "saveMasterpassword",
            masterpassword: passwordInput,
            currentMasterpassword: currentPasswordInput,
        })
        .then((response) => {
            alert(response.message);
        });
}

async function addWords() {
    const newWordsInput = document.getElementById("newBlockedWord").value;
    const response = await browser.runtime.sendMessage({
        action: "addBlockedWords",
        newBlockedWords: newWordsInput,
    });
    document.getElementById("newBlockedWord").value = "";
    displayBlockedWords();
    alert(response.message);
}

async function displayBlockedWords() {
    const response = await browser.runtime.sendMessage({
        action: "getBlockedWords",
    });
    document.getElementById("blockedWords").innerText =
                response.blockedWords.join(", ");
}

document.addEventListener("DOMContentLoaded", displayBlockedWords);
document.getElementById("editWords").addEventListener("click", edit);
document.getElementById("addBlockedWord").addEventListener("click", addWords);
document.getElementById("saveMasterpassword").addEventListener("click", saveMasterpassword);
