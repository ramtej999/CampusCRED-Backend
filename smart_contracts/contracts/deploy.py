# contracts/deploy.py
import os
import base64
from dotenv import load_dotenv
import algokit_utils
from algosdk import account, mnemonic, transaction
from algosdk.logic import get_application_address
from p2p_lending_app import app

# Load environment variables from .env
load_dotenv()

# Use algokit_utils for more robust client initialization
ALGOD_SERVER = os.environ.get("ALGOD_SERVER") or "https://testnet-api.4160.nodely.dev"
ALGOD_TOKEN = os.environ.get("ALGOD_TOKEN") or ("a" * 64)

algod_client = algokit_utils.get_algod_client(
    algokit_utils.AlgoClientConfig(ALGOD_SERVER, ALGOD_TOKEN)
)

# Get account from mnemonic or LocalNet defaults
creator_mnemonic = os.environ.get("HACKATHON_MNEMONIC")
if creator_mnemonic:
    creator_private = mnemonic.to_private_key(creator_mnemonic)
    creator_address = account.address_from_private_key(creator_private)
    print(f"Using account from HACKATHON_MNEMONIC: {creator_address}")
else:
    try:
        # Try to get the default LocalNet account (pre-funded)
        account_obj = algokit_utils.get_localnet_default_account(algod_client)
        creator_private = account_obj.private_key
        creator_address = account_obj.address
        print(f"Using LocalNet pre-funded account: {creator_address}")
    except Exception as e:
        # Final fallback to a hardcoded mnemonic (unfunded on new LocalNet)
        fallback_mnemonic = "cheap song glare foot coffee secret immune comic lottery sponsor hair unable alert check vehicle clock best sleep pretty match awkward chuckle naive about quick"
        creator_private = mnemonic.to_private_key(fallback_mnemonic)
        creator_address = account.address_from_private_key(creator_private)
        print(f"Using fallback mnemonic (may be unfunded): {creator_address}")

# Build Beaker application spec without a client (prevents pyteal status check)
app_spec = app.build()

approval_program_source = app_spec.approval_program
clear_program_source = app_spec.clear_program

# Send compilation to Algod
try:
    print(f"Compiling approval program at {ALGOD_SERVER}...")
    approval_result = algod_client.compile(approval_program_source)
    print(f"Compiling clear program...")
    clear_result = algod_client.compile(clear_program_source)
except Exception as e:
    print(f"Compilation failed: {e}")
    raise e

approval_bytes = base64.b64decode(approval_result["result"])
clear_bytes = base64.b64decode(clear_result["result"])

params = algod_client.suggested_params()

txn = transaction.ApplicationCreateTxn(
    sender=creator_address,
    sp=params,
    on_complete=transaction.OnComplete.NoOpOC,
    approval_program=approval_bytes,
    clear_program=clear_bytes,
    global_schema=transaction.StateSchema(10, 10),
    local_schema=transaction.StateSchema(5, 5),
)

signed_txn = txn.sign(creator_private)
txid = algod_client.send_transaction(signed_txn)
result = transaction.wait_for_confirmation(algod_client, txid, 4)

app_id = result["application-index"]
app_address = get_application_address(app_id)

print("APP ID:", app_id)
print("APP ADDRESS:", app_address)
