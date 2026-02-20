from algosdk import transaction

params = algod_client.suggested_params()

payment = transaction.PaymentTxn(
    sender=lender_address,
    sp=params,
    receiver=app_client.app_addr,
    amt=500000
)

app_client.call(
    app.fund_loan,
    loan_id=0,
    payment=payment
)
