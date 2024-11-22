// Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyBSbpgNHrllE3LqE7AqvvJSFxOb3uHBWRs",
    authDomain: "corded-academy-404101.firebaseapp.com",
    projectId: "corded-academy-404101",
    storageBucket: "corded-academy-404101.appspot.com",
    messagingSenderId: "639823673602",
    appId: "1:639823673602:web:f97ee37fbd38ca0bca6a1b",
    measurementId: "G-8PBCR51KW5"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();

let images = [];
let allResults = [];
let promptImages = [];
let processingQueue = [];
let isProcessing = false;
const RATE_LIMIT_DELAY = 1000;
const IMAGE_PROCESSING_DELAY = 500;
let startTime;
let timerInterval;
let cropper;

pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.9.359/pdf.worker.min.js';

// Authentication functions
function signup() {
    const email = document.getElementById('signupEmail').value;
    const password = document.getElementById('signupPassword').value;
    auth.createUserWithEmailAndPassword(email, password)
        .then((userCredential) => {
            console.log('User signed up');
            showUserInfo(userCredential.user);
        })
        .catch((error) => {
            console.error('Error signing up:', error);
            alert('Sign up failed: ' + error.message);
        });
}

function login() {
    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;
    auth.signInWithEmailAndPassword(email, password)
        .then((userCredential) => {
            console.log('User logged in');
            showUserInfo(userCredential.user);
        })
        .catch((error) => {
            console.error('Error logging in:', error);
            alert('Login failed: ' + error.message);
        });
}

function logout() {
    auth.signOut().then(() => {
        console.log('User signed out');
        showAuthForms();
    }).catch((error) => {
        console.error('Error signing out:', error);
    });
}

function showUserInfo(user) {
    document.getElementById('authContainer').style.display = 'none';
    document.getElementById('userInfo').style.display = 'block';
    document.getElementById('appContent').style.display = 'block';
    document.getElementById('userEmail').textContent = user.email;
    loadSavedMCQs();
}

function showAuthForms() {
    document.getElementById('authContainer').style.display = 'flex';
    document.getElementById('userInfo').style.display = 'none';
    document.getElementById('appContent').style.display = 'none';
}

// Check auth state on page load
auth.onAuthStateChanged((user) => {
    if (user) {
        showUserInfo(user);
    } else {
        showAuthForms();
    }
});

async function convertPDFToImages(file) {
    const pdf = await pdfjsLib.getDocument(URL.createObjectURL(file)).promise;
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const imageGrid = document.getElementById('imageGrid');

    for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
        const page = await pdf.getPage(pageNum);
        const viewport = page.getViewport({ scale: 1.5 });
        canvas.height = viewport.height;
        canvas.width = viewport.width;

        await page.render({ canvasContext: ctx, viewport }).promise;

        const imageContainer = document.createElement('div');
        imageContainer.className = 'image-container';

        const img = new Image();
        img.src = canvas.toDataURL();
        img.onload = function() {
            const imageFile = dataURLtoFile(img.src, `page_${pageNum}.png`);
            
            const removeButton = document.createElement('button');
            removeButton.className = 'image-control-btn';
            removeButton.textContent = '×';
            removeButton.onclick = function() {
                removeImage(imageContainer, imageFile);
            };

            const cropButton = document.createElement('button');
            cropButton.className = 'image-control-btn';
            cropButton.textContent = 'Crop';
            cropButton.onclick = function() {
                openCropper(img.src, imageFile, imageContainer);
            };

            const copyButton = document.createElement('button');
            copyButton.className = 'image-control-btn';
            copyButton.textContent = 'Copy';
            copyButton.onclick = function() {
                copyImageToClipboard(img);
            };

            const downloadButton = document.createElement('button');
            downloadButton.className = 'image-control-btn';
            downloadButton.textContent = 'Download';
            downloadButton.onclick = function() {
                downloadImage(img.src, `page_${pageNum}.png`);
            };

            const controlsDiv = document.createElement('div');
            controlsDiv.className = 'image-controls';
            controlsDiv.appendChild(removeButton);
            controlsDiv.appendChild(cropButton);
            controlsDiv.appendChild(copyButton);
            controlsDiv.appendChild(downloadButton);

            imageContainer.appendChild(img);
            imageContainer.appendChild(controlsDiv);
            imageGrid.appendChild(imageContainer);
            images.push(imageFile);
        }
    }
}

function dataURLtoFile(dataurl, filename) {
    let arr = dataurl.split(','),
        mime = arr[0].match(/:(.*?);/)[1],
        bstr = atob(arr[1]), 
        n = bstr.length, 
        u8arr = new Uint8Array(n);
    while(n--){
        u8arr[n] = bstr.charCodeAt(n);
    }
    return new File([u8arr], filename, {type:mime});
}

function addImages(files) {
    const imageGrid = document.getElementById('imageGrid');
    
    for (let file of files) {
        const reader = new FileReader();
        reader.onload = function(e) {
            const imageContainer = document.createElement('div');
            imageContainer.className = 'image-container';
            
            const img = document.createElement('img');
            img.src = e.target.result;
            
            const removeButton = document.createElement('button');
            removeButton.className = 'image-control-btn';
            removeButton.textContent = '×';
            removeButton.onclick = function() {
                removeImage(imageContainer, file);
            };

            const cropButton = document.createElement('button');
            cropButton.className = 'image-control-btn';
            cropButton.textContent = 'Crop';
            cropButton.onclick = function() {
                openCropper(img.src, file, imageContainer);
            };

            const copyButton = document.createElement('button');
            copyButton.className = 'image-control-btn';
            copyButton.textContent = 'Copy';
            copyButton.onclick = function() {
                copyImageToClipboard(img);
            };

            const downloadButton = document.createElement('button');
            downloadButton.className = 'image-control-btn';
            downloadButton.textContent = 'Download';
            downloadButton.onclick = function() {
                downloadImage(img.src, file.name);
            };

            const controlsDiv = document.createElement('div');
            controlsDiv.className = 'image-controls';
            controlsDiv.appendChild(removeButton);
            controlsDiv.appendChild(cropButton);
            controlsDiv.appendChild(copyButton);
            controlsDiv.appendChild(downloadButton);

            imageContainer.appendChild(img);
            imageContainer.appendChild(controlsDiv);
            imageGrid.appendChild(imageContainer);
            images.push(file);
        }
        reader.readAsDataURL(file);
    }
}

function removeImage(container, file) {
    container.remove();
    images = images.filter(img => img !== file);
}

function openCropper(imageSrc, file, container) {
    const cropperModal = document.getElementById('cropperModal');
    const cropperImage = document.getElementById('cropperImage');
    cropperImage.src = imageSrc;
    cropperModal.style.display = 'block';

    if (cropper) {
        cropper.destroy();
    }

    cropper = new Cropper(cropperImage, {
        aspectRatio: NaN,
        viewMode: 1,
    });

    cropperModal.dataset.file = JSON.stringify(file);
    cropperModal.dataset.container = container.id;
}

function applyCrop() {
    const cropperModal = document.getElementById('cropperModal');
    const file = JSON.parse(cropperModal.dataset.file);
    const container = document.getElementById(cropperModal.dataset.container);

    cropper.getCroppedCanvas().toBlob((blob) => {
        const newFile = new File([blob], file.name, { type: file.type });
        const img = container.querySelector('img');
        img.src = URL.createObjectURL(blob);
        
        // Update the file in the images array
        const index = images.findIndex(i => i.name === file.name && i.size === file.size);
        if (index !== -1) {
            images[index] = newFile;
        }

        cropper.destroy();
        cropperModal.style.display = 'none';
    });
}

function cancelCrop() {
    const cropperModal = document.getElementById('cropperModal');
    cropper.destroy();
    cropperModal.style.display = 'none';
}

function copyImageToClipboard(img) {
    const canvas = document.createElement('canvas');
    canvas.width = img.width;
    canvas.height = img.height;
    canvas.getContext('2d').drawImage(img, 0, 0, img.width, img.height);
    canvas.toBlob(function(blob) {
        navigator.clipboard.write([
            new ClipboardItem({ 'image/png': blob })
        ]).then(function() {
            alert('Image copied to clipboard!');
        }, function(err) {
            console.error('Could not copy image: ', err);
        });
    });
}

function downloadImage(imageSrc, fileName) {
    const link = document.createElement('a');
    link.href = imageSrc;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

async function processMCQs(withSolution) {
    const apiKey = document.getElementById('apiKey').value;
    const modelName = document.getElementById('modelSelect').value;
    const resultsContainer = document.getElementById('resultsContainer');

    if (!apiKey) {
        alert('Please enter API key.');
        return;
    }

    if (images.length === 0) {
        alert('Please add at least one image.');
        return;
    }

    resultsContainer.innerHTML = "<div class='code-block'>Processing MCQs from images...</div>";
    allResults = [];

    processingQueue = [...images];
    isProcessing = true;
    startTimer();
    updateProgressBar(0, images.length);

    await processNextImage(apiKey, modelName, withSolution);
}

async function processNextImage(apiKey, modelName, withSolution) {
    if (processingQueue.length === 0) {
        isProcessing = false;
        updateProgressBar(images.length, images.length);
        displayResults();
        stopTimer();
        playAlarmSound();
        return;
    }

    const image = processingQueue.shift();

    try {
        const imageData = await getBase64(image);
        const processedMCQ = await callGeminiAPI(apiKey, modelName, imageData, image.type, withSolution);
        allResults.push(processedMCQ);
        updateProgressBar(images.length - processingQueue.length, images.length);
    } catch (error) {
        console.error(`Error processing image:`, error);
        if (error.message.includes('Rate limit exceeded')) {
            processingQueue.unshift(image);
            await new Promise(resolve => setTimeout(resolve, RATE_LIMIT_DELAY));
        } else {
            allResults.push(`Error processing image: ${error.message}`);
        }
    }

    await new Promise(resolve => setTimeout(resolve, IMAGE_PROCESSING_DELAY));
    await processNextImage(apiKey, modelName, withSolution);
}

function getBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result.split(',')[1]);
        reader.onerror = error => reject(error);
    });
}

async function callGeminiAPI(apiKey, modelName, imageData, mimeType, withSolution) {
    const prompt = `Analyze this image containing multiple-choice questions (MCQs). Extract the questions, options, and ${withSolution ? 'provide solutions' : 'do not provide solutions'}. Follow these rules:

    1. Format each MCQ ${withSolution ? 'and its solution ' : ''}as a separate block give if there one or more mcq .
    2. Left-align all content within each block.
    3. Use numbers (1, 2, 3, 4) instead of letters for options.
    4. Preserve the original question numbers from the image.
    5. ${withSolution ? 'Provide the solution directly after the options within the same block.' : 'Do not provide solutions.'}
    6. Indicate the correct answer with a green checkmark (✅) next to the correct option.
    7. If there's a table in the question, format it using HTML table tags. Use the class "mcq-table" for the table element.
    8. Use this format for your output:

    [Original Question number]. [Question text ) translate to tamil ( with english and tamil mcq)] ( tamil not tanglish
    [HTML table, if present]
    1. [Option 1]
    2. [Option 2]
    3. [Option 3]
    4. [Option 4] ✅ (if this is the correct answer)
    ${withSolution ? 'Solution: [Detailed explanation of the solution with complete calculations, presented line by line for readability or if there already solution available use that solution without modification]' : ''}

    9. Do not use LaTeX formatting. Present all content in plain text.
    10. Use '^' for exponents instead of HTML superscript tags. For example, write 'x^2' .
    11. If you detect a diagram or complex image in the question, add the fire emoji (🔥) at the beginning of the question text.
    ${withSolution ? '12. Prioritize accuracy in all calculations and logic.' : ''}
    13. Separate each MCQ block with two blank lines.
    14. Do not include phrases like "Therefore, the correct answer is...".
    sample :
    15. The population of a town increases at the rate of 10% every year. The present population is 1,000. In how many years will the population become 1,331? 
        (ஒரு நகரத்தின் மக்கள் தொகை ஒவ்வொரு ஆண்டும் 10% விகிதத்தில் அதிகரிக்கிறது. தற்போதைய மக்கள் தொகை 1,000. எத்தனை ஆண்டுகளில் மக்கள் தொகை 1,331 ஆக மாறும்?)
         1. 3 ✅
         2. 2.5 
         3. 2 (2)
         4. 3.5 (3.5)
         Solution:
         Let, n years will the population become 1,331.
         We know that,
         A = P [1 + (r/100)]^n
         1331 = 1000 [1 + (10/100)]^n
         1331 = 1000 [1 + (1/10)]^n
         1331 = 1000 [11/10]^n
         1331/1000 = [11/10]^n
         (11/10)^3 = (11/10)^n
         n = 3 years
         n ஆண்டுகள் மக்கள் தொகை 1,331 ஆக மாறும் என்க.
         நமக்குத் தெரியும்,
         A = P [1 + (r/100)]^n
         1331 = 1000 [1 + (10/100)]^n
         1331 = 1000 [1 + (1/10)]^n
         1331 = 1000 [11/10]^n
         1331/1000 = [11/10]^n

         16. if solution is availabele use that solution without modification 
         
    Your primary goal is to provide accurate, well-formatted MCQs${withSolution ? ' and solutions' : ''} based on the image content provided.`;
    
    const maxRetries = 5;
    const baseDelay = 1000; // 1 second

    for (let attempt = 0; attempt < maxRetries; attempt++) {
        try {
            const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [{
                        parts: [
                            { text: prompt },
                            { inline_data: { mime_type: mimeType, data: imageData } }
                        ]
                    }],
                    generationConfig: {
                        temperature: 0.1,
                        topK: 40,
                        topP: 0.95,
                        maxOutputTokens: 8192,
                        stopSequences: []
                    }
                })
            });

            if (!response.ok) {
                const errorData = await response.json();
                if (response.status === 429) {
                    const delay = baseDelay * Math.pow(2, attempt);
                    console.log(`Rate limit exceeded. Retrying in ${delay}ms...`);
                    await new Promise(resolve => setTimeout(resolve, delay));
                    continue;
                }
                throw new Error(`API error: ${response.status} - ${JSON.stringify(errorData)}`);
            }

            const data = await response.json();
            return data.candidates[0].content.parts[0].text.trim();
        } catch (error) {
            if (attempt === maxRetries - 1) {
                throw error;
            }
        }
    }
}

function displayResults() {
    const resultsContainer = document.getElementById('resultsContainer');
    resultsContainer.innerHTML = '';
    allResults.forEach((result, index) => {
        const codeBlock = document.createElement('div');
        codeBlock.className = 'code-block';
        codeBlock.innerHTML = `<div class="editable" contenteditable="true">${result}</div>`;
        
        const copyButton = document.createElement('button');
        copyButton.className = 'copy-button';
        copyButton.textContent = 'Copy';
        copyButton.onclick = () => copyToClipboard(result, copyButton);
        
        const deleteButton = document.createElement('button');
        deleteButton.className = 'delete-button';
        deleteButton.textContent = 'Delete';
        deleteButton.onclick = () => deleteResult(index);
        
        const editButton = document.createElement('button');
        editButton.className = 'edit-button';
        editButton.textContent = 'Save';
        editButton.onclick = () => saveEdit(index, codeBlock.querySelector('.editable'));
        
        const verifyButton = document.createElement('button');
        verifyButton.className = 'verify-button';
        verifyButton.textContent = 'Verify Solution';
        verifyButton.onclick = () => verifySolution(index);
        
        codeBlock.appendChild(copyButton);
        codeBlock.appendChild(deleteButton);
        codeBlock.appendChild(editButton);
        codeBlock.appendChild(verifyButton);
        resultsContainer.appendChild(codeBlock);
    });
}

function copyToClipboard(text, button) {
    navigator.clipboard.writeText(text).then(() => {
        const originalText = button.textContent;
        button.textContent = 'Copied!';
        setTimeout(() => {
            button.textContent = originalText;
        }, 2000);
    }, (err) => {
        console.error('Could not copy text: ', err);
        alert('Failed to copy text. Please try again.');
    });
}

function orderMCQs() {
    const orderedResults = allResults.flatMap(result => result.split('\n\n\n'))
        .filter(mcq => mcq.trim().match(/^\d+\./))
        .sort((a, b) => {
            const numA = parseInt(a.match(/^(\d+)\./)[1]);
            const numB = parseInt(b.match(/^(\d+)\./)[1]);
            return numA - numB;
        });

    // Check for missing MCQs
    const numbers = orderedResults.map(mcq => parseInt(mcq.match(/^(\d+)\./)[1]));
    const maxNumber = Math.max(...numbers);
    for (let i = 1; i <= maxNumber; i++) {
        if (!numbers.includes(i)) {
            console.warn(`MCQ number ${i} is missing`);
        }
    }

    allResults = [orderedResults.join('\n\n\n')];
    displayResults();
}

function copyAllResults() {
    const allText = allResults.join('\n\n\n');
    copyToClipboard(allText, document.querySelector('.copy-button'));
}

function deleteResult(index) {
    allResults.splice(index, 1);
    displayResults();
}

function saveEdit(index, editableDiv) {
    allResults[index] = editableDiv.innerText;
    displayResults();
}

async function recheckSolutions() {
    const apiKey = document.getElementById('apiKey').value;
    const modelName = document.getElementById('modelSelect').value;

    if (!apiKey) {
        alert('Please enter API key.');
        return;
    }

    const reCheckedResults = [];
    for (let mcq of allResults.flatMap(result => result.split('\n\n\n'))) {
        try {
            const recheckedMCQ = await callGeminiAPI(apiKey, modelName, mcq, 'text/plain', true);
            reCheckedResults.push(recheckedMCQ);
        } catch (error) {
            console.error(`Error rechecking MCQ:`, error);
            reCheckedResults.push(`Error rechecking MCQ: ${error.message}`);
        }
        await new Promise(resolve => setTimeout(resolve, IMAGE_PROCESSING_DELAY));
    }

    allResults = [reCheckedResults.join('\n\n\n')];
    displayResults();
}

async function verifySolution(index) {
    const apiKey = document.getElementById('apiKey').value;
    const modelName = document.getElementById('modelSelect').value;

    if (!apiKey) {
        alert('Please enter API key.');
        return;
    }

    const mcq = allResults[index];
    try {
        const verifiedMCQ = await callGeminiAPI(apiKey, modelName, mcq, 'text/plain', true);
        allResults[index] = verifiedMCQ;
        displayResults();
    } catch (error) {
        console.error(`Error verifying solution:`, error);
        alert(`Error verifying solution: ${error.message}`);
    }
}

function editPrompt() {
    const promptInput = document.getElementById('promptInput');
    const promptPreview = document.getElementById('promptPreview');
    promptPreview.textContent = promptInput.value;
    promptPreview.style.display = 'block';
    promptInput.style.display = 'none';
}

async function processPrompt() {
    const apiKey = document.getElementById('apiKey').value;
    const modelName = document.getElementById('modelSelect').value;
    const promptInput = document.getElementById('promptInput');
    const promptPreview = document.getElementById('promptPreview');
    const resultsContainer = document.getElementById('resultsContainer');

    if (!apiKey) {
        alert('Please enter API key.');
        return;
    }

    const userPrompt = promptPreview.style.display === 'block' ? promptPreview.textContent : promptInput.value;
    if (!userPrompt && promptImages.length === 0) {
        alert('Please enter a prompt or upload an image.');
        return;
    }

    try {
        const currentMCQs = allResults.length > 0 ? allResults.join('\n\n') : "No MCQs extracted yet.";
        let imageData = [];

        for (let file of promptImages) {
            imageData.push({
                inline_data: {
                    mime_type: file.type,
                    data: await getBase64(file)
                }
            });
        }

        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{
                    parts: [
                        { text: `Current MCQs:\n\n${currentMCQs}\n\nUser prompt: ${userPrompt}\n\nInstructions:
            1. Process the MCQs according to the user's prompt.
            2. Only modify the questions specified in the prompt.
            3. For each modified question, create a new entry without changing the original.
            4. Do not include phrases like "Therefore, the correct answer is...".
            5. Maintain the original formatting and structure of the MCQs.
            6. If no MCQs exist, generate new ones based on the prompt.
            7. Return only the new or modified MCQs, not the entire set.
            8. If images are provided, analyze them and incorporate relevant information into the MCQs.
            9. Provide complete calculations in solutions, formatted line by line for readability.
            10. Use '^' for exponents instead of HTML superscript tags. For example, write 'x^2' instead of 'x<sup>2</sup>'.
            11. If you detect a diagram or complex image in the question, add the fire emoji (🔥) at the beginning of the question text.` },
                        ...imageData
                    ]
                }],
                generationConfig: {
                    temperature: 0.4,
                    topK: 40,
                    topP: 0.95,
                    maxOutputTokens: 8192,
                    stopSequences: []
                }
            })
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(`API error: ${response.status} - ${JSON.stringify(errorData)}`);
        }

        const data = await response.json();
        const processedResult = data.candidates[0].content.parts[0].text.trim();
        allResults.push(processedResult);
        displayResults();
        promptInput.value = '';
        promptPreview.textContent = '';
        promptPreview.style.display = 'none';
        promptInput.style.display = 'block';
        clearPromptImages();
    } catch (error) {
        console.error('Error processing prompt:', error);
        alert(`Error processing prompt: ${error.message}`);
    }
}

function clearPromptImages() {
    const promptImagesContainer = document.getElementById('promptImages');
    promptImagesContainer.innerHTML = '';
    promptImages = [];
    document.getElementById('promptImageInput').value = '';
}

function updateProgressBar(current, total) {
    const progressBar = document.getElementById('progressBarFill');
    const progressText = document.getElementById('progressText');
    const percentage = (current / total) * 100;
    progressBar.style.width = `${percentage}%`;
    progressText.textContent = `Processing: ${current} / ${total} images`;
}

function startTimer() {
    startTime = Date.now();
    updateTimer();
    timerInterval = setInterval(updateTimer, 1000);
}

function stopTimer() {
    clearInterval(timerInterval);
}

function updateTimer() {
    const elapsedTime = Math.floor((Date.now() - startTime) / 1000);
    const hours = Math.floor(elapsedTime / 3600);
    const minutes = Math.floor((elapsedTime % 3600) / 60);
    const seconds = elapsedTime % 60;
    document.getElementById('timerDisplay').textContent = 
        `Time elapsed: ${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}

function playAlarmSound() {
    const alarmSound = document.getElementById('alarmSound');
    alarmSound.play();
}

// Firebase-specific functions
function saveToFirebase() {
    if (!auth.currentUser) {
        alert('Please log in to save results');
        return;
    }
    db.collection('mcqs').add({
        userId: auth.currentUser.uid,
        results: allResults,
        timestamp: firebase.firestore.FieldValue.serverTimestamp()
    })
    .then((docRef) => {
        console.log("Document written with ID: ", docRef.id);
        alert('Results saved successfully!');
        loadSavedMCQs();
    })
    .catch((error) => {
        console.error("Error adding document: ", error);
        alert('Error saving results');
    });
}

function loadSavedMCQs() {
    if (!auth.currentUser) return;
    db.collection('mcqs')
        .where('userId', '==', auth.currentUser.uid)
        .orderBy('timestamp', 'desc')
        .get()
        .then((querySnapshot) => {
            const savedMCQsContainer = document.getElementById('savedMCQs');
            savedMCQsContainer.innerHTML = '<h3>Saved MCQs</h3>';
            querySnapshot.forEach((doc) => {
                const mcqSet = doc.data();
                const mcqDiv = document.createElement('div');
                mcqDiv.className = 'mcq-item';
                mcqDiv.textContent = `MCQ Set from ${mcqSet.timestamp.toDate().toLocaleString()}`;
                mcqDiv.onclick = () => {
                    allResults = mcqSet.results;
                    displayResults();
                };
                savedMCQsContainer.appendChild(mcqDiv);
            });
        })
        .catch((error) => {
            console.error("Error loading saved MCQs: ", error);
        });
}

// Event listeners
document.getElementById('themeToggle').addEventListener('click', function() {
    const currentTheme = document.documentElement.getAttribute('data-theme');
    let newTheme;
    switch (currentTheme) {
        case 'light':
            newTheme = 'dark';
            break;
        case 'dark':
            newTheme = 'blue';
            break;
        case 'blue':
            newTheme = 'green';
            break;
        default:
            newTheme = 'light';
    }
    document.documentElement.setAttribute('data-theme', newTheme);
});

document.addEventListener('dragover', (e) => {
    e.preventDefault();
});

document.addEventListener('drop', (e) => {
    e.preventDefault();
    handleFiles(e.dataTransfer.files);
});

document.addEventListener('paste', (e) => {
    const items = e.clipboardData.items;
    for (let item of items) {
        if (item.type.indexOf('image') !== -1) {
            const blob = item.getAsFile();
            handleFiles([blob]);
        }
    }
});

function handleFiles(files) {
    for (let file of files) {
        if (file.type === 'application/pdf') {
            convertPDFToImages(file);
        } else if (file.type.startsWith('image/')) {
            addImages([file]);
        }
    }
}

document.getElementById('pdfInput').addEventListener('change', function(e) {
    const file = e.target.files[0];
    if (file && file.type === 'application/pdf') {
        convertPDFToImages(file);
    } else {
        alert('Please upload a PDF file.');
    }
});

document.getElementById('imageInput').addEventListener('change', function(e) {
    addImages(e.target.files);
});

const promptBox = document.getElementById('promptBox');
const promptInput = document.getElementById('promptInput');

promptBox.addEventListener('dragover', (e) => {
    e.preventDefault();
    promptBox.style.backgroundColor = 'rgba(0, 0, 0, 0.1)';
});

promptBox.addEventListener('dragleave', () => {
    promptBox.style.backgroundColor = '';
});

promptBox.addEventListener('drop', (e) => {
    e.preventDefault();
    promptBox.style.backgroundColor = '';
    handlePromptFiles(e.dataTransfer.files);
});

promptInput.addEventListener('paste', (e) => {
    const items = e.clipboardData.items;
    for (let item of items) {
        if (item.type.indexOf('image') !== -1) {
            const blob = item.getAsFile();
            handlePromptFiles([blob]);
        }
    }
});

function handlePromptFiles(files) {
    for (let file of files) {
        if (file.type.startsWith('image/')) {
            addPromptImage(file);
        }
    }
}

function addPromptImage(file) {
    const reader = new FileReader();
    reader.onload = function(e) {
        const img = document.createElement('img');
        img.src = e.target.result;
        document.getElementById('promptImages').appendChild(img);
        promptImages.push(file);
    }
    reader.readAsDataURL(file);
}

// Initialize the application
document.addEventListener('DOMContentLoaded', function() {
    // Set initial theme
    const prefersDarkScheme = window.matchMedia("(prefers-color-scheme: dark)");
    if (prefersDarkScheme.matches) {
        document.documentElement.setAttribute('data-theme', 'dark');
    } else {
        document.documentElement.setAttribute('data-theme', 'light');
    }

    // Check if user is already logged in
    auth.onAuthStateChanged((user) => {
        if (user) {
            showUserInfo(user);
        } else {
            showAuthForms();
        }
    });

    // Initialize any necessary components or state
});
