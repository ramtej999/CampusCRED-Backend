const algosdk = require('algosdk');
const algokit = require('@algorandfoundation/algokit-utils');
const fs = require('fs');
const path = require('path');

// Load App Spec
const appSpecPath = path.join(__dirname, '../../contracts/artifacts/application.json');
const appSpecStr = fs.existsSync(appSpecPath) ? fs.readFileSync(appSpecPath, 'utf8') : '{}';
const appSpec = JSON.parse(appSpecStr);

const algodConfig = {
    server: process.env.VITE_ALGOD_SERVER || 'http://localhost',
    port: process.env.VITE_ALGOD_PORT || '4001',
    token: process.env.VITE_ALGOD_TOKEN || 'a'.repeat(64),
};

const algodClient = new algosdk.Algodv2(algodConfig.token, algodConfig.server, algodConfig.port);
const appId = parseInt(process.env.VITE_APP_ID || "1"); // Make sure this is retrieved properly in prod

const getAppClient = (senderAccount) => {
    return algokit.getAppClient(
        {
            app: JSON.stringify(appSpec),
            id: appId,
            sender: senderAccount,
            resolveBy: 'id',
        },
        algodClient
    );
};

const getAccountFromMnemonic = (mnemonic) => {
    try {
        const sanitized = mnemonic.toLowerCase().replace(/[^a-z\s]/g, ' ').trim().replace(/\s+/g, ' ');
        return algosdk.mnemonicToSecretKey(sanitized);
    } catch (e) {
        throw new Error("Invalid Algorand Mnemonic");
    }
};

const createLoanOnChain = async (lenderMnemonic, loanIdStr, borrowerAddress, amount, durationSecs) => {
    const sender = getAccountFromMnemonic(lenderMnemonic);
    const client = getAppClient(sender);

    // We send a payment from lender to borrower equal to amount
    const suggestedParams = await algodClient.getTransactionParams().do();

    const paymentTxn = algosdk.makePaymentTxnWithSuggestedParamsFromObject({
        from: sender.addr,
        to: borrowerAddress,
        amount: amount,
        suggestedParams,
    });

    // Using Composer to group transactions properly
    const composer = client.compose();

    composer.addTransaction({ txn: paymentTxn, signer: algosdk.makeBasicAccountTransactionSigner(sender) });
    composer.addMethodCall({
        method: 'create_loan',
        methodArgs: [loanIdStr, sender.addr, borrowerAddress, amount, durationSecs],
        boxes: [{ appIndex: 0, name: new Uint8Array(Buffer.from(loanIdStr)) }],
        sendParams: {
            suppressLog: true,
            fee: algokit.microAlgos(2000) // Increase fee to cover inner operations if needed
        }
    });

    const result = await composer.execute();
    return result;
};

const repayLoanOnChain = async (borrowerMnemonic, loanIdStr, lenderAddress, amount) => {
    const sender = getAccountFromMnemonic(borrowerMnemonic);
    const client = getAppClient(sender);

    const suggestedParams = await algodClient.getTransactionParams().do();

    const paymentTxn = algosdk.makePaymentTxnWithSuggestedParamsFromObject({
        from: sender.addr,
        to: lenderAddress,
        amount: amount,
        suggestedParams,
    });

    const composer = client.compose();

    composer.addTransaction({ txn: paymentTxn, signer: algosdk.makeBasicAccountTransactionSigner(sender) });
    composer.addMethodCall({
        method: 'repay_loan',
        methodArgs: [loanIdStr],
        boxes: [{ appIndex: 0, name: new Uint8Array(Buffer.from(loanIdStr)) }],
        sendParams: { suppressLog: true, fee: algokit.microAlgos(2000) }
    });

    const result = await composer.execute();
    return result;
};

const markDefaultOnChain = async (adminOrLenderMnemonic, loanIdStr) => {
    const sender = getAccountFromMnemonic(adminOrLenderMnemonic);
    const client = getAppClient(sender);

    const result = await client.call({
        method: 'mark_default',
        methodArgs: [loanIdStr],
        boxes: [{ appIndex: 0, name: new Uint8Array(Buffer.from(loanIdStr)) }],
        sendParams: { suppressLog: true, fee: algokit.microAlgos(2000) }
    });

    return result;
};

module.exports = {
    algodClient,
    getAccountFromMnemonic,
    createLoanOnChain,
    repayLoanOnChain,
    markDefaultOnChain
};
