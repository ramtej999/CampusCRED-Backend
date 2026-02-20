from algosdk.v2client import algod
from algosdk import mnemonic
from beaker import client
from p2p_lending_app import app

ALGOD_ADDRESS = "http://localhost:4001"
ALGOD_TOKEN = "a" * 64

algod_client = algod.AlgodClient(ALGOD_TOKEN, ALGOD_ADDRESS)

member_mn = "MEMBER_MNEMONIC"
member_pk = mnemonic.to_private_key(member_mn)

app_client = client.ApplicationClient(
    algod_client,
    app,
    app_id=YOUR_APP_ID,
    signer=member_pk
)

app_client.opt_in()
app_client.call(app.register, emp_id="EMP001")

