/*
 * SPDX-License-Identifier: Apache-2.0
 */

'use strict';


// async CreateVoucher(ctx, id, citizen_id, supplier_id, dealer_id, status, value, package_id, created_at, updated_at)
// async ReadVoucher(ctx, id) 
// async DeleteVoucher(ctx, id)
// async CommitVoucher(ctx, id, newStatus, dealer_id, package_id)
// async GetVouchersByRange(ctx, startKey, endKey)
// async QueryAssetsByCitizen(ctx, citizen_id)
// async QueryVoucher(ctx, queryString)
// async GetQueryResultForQueryString(ctx, queryString)
// async GetVouchersByRangeWithPagination(ctx, startKey, endKey, pageSize, bookmark) 
// async QueryVouchersWithPagination(ctx, queryString, pageSize, bookmark)
// async GetVoucherHistory(ctx, voucher_id)
// async VoucherExists(ctx, voucher_id)
// async _GetAllResults(iterator, isHistory)
// async InitLedger(ctx) 


const { Gateway, Wallets } = require('fabric-network');
const fs = require('fs');
const path = require('path');

async function main() {
    try {
        // load the network configuration
        const ccpPath = path.resolve(__dirname, '.', 'connection.json');
        const ccp = JSON.parse(fs.readFileSync(ccpPath, 'utf8'));

        // Create a new file system based wallet for managing identities.
        const walletPath = path.join('./wallets', 'org0.example.com');
        const wallet = await Wallets.newFileSystemWallet(walletPath);
        console.log(`Wallet path: ${walletPath}`);

        // Check to see if we've already enrolled the admin user.
        const identity = await wallet.get('Admin');
        if (!identity) {
            console.log('Admin identity can not be found in the wallet');
            return;
        }

        const gateway = new Gateway();
        await gateway.connect(ccp, { wallet, identity: 'Admin', discovery: { enabled: true, asLocalhost: false } });

        // Get the network (channel) our contract is deployed to.
        const network = await gateway.getNetwork('mychannel');

        // Get the contract from the network.
        const contract = network.getContract('voucher');


        // console.log('\n--> Submit Transaction: InitLedger, function creates the initial set of assets on the ledger');
        // await contract.submitTransaction('InitLedger');
        // console.log('*** Result: committed');

        // console.log('\n--> Submit Transaction: Delete voucher');
        // await contract.submitTransaction('DeleteVoucher', "133");
        // console.log('*** Result: committed');

        // const voucher = { id: "155", citizen_id: "123", supplier_id: "123", dealer_id: "123", status: "UNUSE", value: "123", package_id: "123", created_at: new Date().toString(), updated_at: new Date().toString() }

        // console.log('Add assets')
        // await contract.submitTransaction("CreateVoucher", voucher.id, voucher.citizen_id, voucher.supplier_id, voucher.dealer_id, voucher.status, voucher.value, voucher.package_id, voucher.created_at, voucher.updated_at)
        // console.log('*** Result: committed');

        const query = {
            selector: { docType: "voucher", voucher_id: "122" }
        }

        // const result = await contract.evaluateTransaction('QueryAssetsWithPagination', JSON.stringify(query), 10, "");
        // console.log('List before change')
        // console.log(JSON.parse(result.toString()));

        // console.log('Commit used voucher')
        // await contract.submitTransaction("CommitVoucher", "122", "USED", "dealer1", "package1")
        // console.log('*** Result: committed');

        // console.log('Get voucher history')
        // const newResult = await contract.evaluateTransaction("GetVoucherHistory", "122")
        // console.log('Voucher after change')
        // console.log(JSON.parse(newResult.toString()));

        // const result = await contract.evaluateTransaction('QueryAssets', JSON.stringify(query));
        // console.log('List query')
        // console.log(JSON.parse(result.toString()));

        // const result = await contract.evaluateTransaction('QueryAssetsByOwner', "123");
        // console.log('Read voucher')
        // console.log(JSON.parse(result.toString()));

        await gateway.disconnect();

    } catch (error) {
        console.error(`Failed to enroll admin user "admin": ${error}`);
        process.exit(1);
    }
}

main();