import QuickBooks from 'node-quickbooks';

type QboInstance = InstanceType<typeof QuickBooks>;

// promisify the getCompanyInfo function
const getCompanyInfo = (qbo: QboInstance): Promise<{ CompanyName: string }> => {
    return new Promise((resolve, reject) => {
        qbo.getCompanyInfo((err: any, companyInfo: { CompanyName: string }) => {
            if (err) {
                reject(err);
            } else {
                resolve(companyInfo);
            }
        });
    });
};

// Function to initialize the QBO object
export const initializeQb = (
    consumerKey: string,
    consumerSecret: string,
    token: string,
    tokenSecret: string,
    realmId: string,
    isSandbox: boolean,
    debug: boolean = false
): QboInstance => {
    return new QuickBooks(
        consumerKey,
        consumerSecret,
        token,
        tokenSecret,
        realmId,
        isSandbox,
        debug
    );
};

// A simple utility to check the connection
export const checkQboConnection = async (qbo: QboInstance) => {
    try {
        const companyInfo = await getCompanyInfo(qbo);
        console.log('Successfully connected to QuickBooks. Company name:', companyInfo.CompanyName);
        return { connected: true, companyName: companyInfo.CompanyName };
    } catch (error) {
        console.error('Failed to connect to QuickBooks:', error);
        return { connected: false, error };
    }
}; 