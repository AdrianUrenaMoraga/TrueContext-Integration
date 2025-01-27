import 'dotenv/config';
import { getForms, getFormsById, getFormSubmision, getFormSubmisionById, getUserById, getFormSubmisionByIdFull } from './api/truecontext.js';
import { createOrUpdateContactInHubSpot, createOrUpdateCompanyInHubSpot, 
    createOrUpdateGestionVisitaInHubSpot, associateGestionVisitaWithContact, 
    associateGestionVisitaWithCompany, createOrUpdateCompanyProspectoInHubSpot} from './api/hubspot.js';
import {getFirstAndLastDateOfCurrentMonth, logWithTimestamp, logErrorWithTimestamp, getCompanyName} from './utils/util.js';
(async()=> {
    
try{
    //const { firstDate, lastDate } = getFirstAndLastDateOfCurrentMonth();

    //const firstDate = "2025-01-11T00:00:00.000Z";
    //const lastDate = "2025-01-11T23:59:59.999Z";

    console.log('First Date:', firstDate);
    console.log('Last Date:', lastDate);
    
    const forms = await getFormSubmision( 1910671007, firstDate, lastDate );
    //console.log('Forms:', forms);

    for (const form of forms) {
        //console.log('Form:', form);

        const [ hubspotVisita, data ] = await createOrUpdateGestionVisitaInHubSpot( form );
        /*
        const hubspotContact = await createOrUpdateContactInHubSpot( form.userId, form );

        //logWithTimestamp(`Id Visita: ${hubspotVisita.id}, Id Contacto: ${hubspotContact.id}`);
        
        if (hubspotContact) {
            logWithTimestamp(`Associating gestion visita ${hubspotVisita.id} with contact ${hubspotContact.id}`);
            await associateGestionVisitaWithContact(hubspotVisita.id, hubspotContact.id);
        } else {
            logWithTimestamp(`No matching contact found for gestion visita id_cliente: ${form.formId}`);
        }
        */
       //console.log('Prospecto antes: ', hubspotVisita);
       if (hubspotVisita.id) {
            if(data["NoClienteMedico"] !== "" && data["BusquedaPorNombre"] !== ""){
                const hubspotCompany = await createOrUpdateCompanyInHubSpot( data["NoClienteMedico"] , data );
                if (hubspotCompany) {
                    logWithTimestamp(`Associating gestion visita ${hubspotVisita.id} with company ${hubspotCompany.id}`);
                    await associateGestionVisitaWithCompany(hubspotVisita.id, hubspotCompany.id);
                } else {
                    logWithTimestamp(`No Medic number or Medic name given for form: ${form.formId}`);
                }
            }
       
            if((data["ProspectoLista"] !== '' && data["ProspectoLista"] !== null) || (data["NombreProspecto"] !== '' && data["NombreProspecto"] !== null)
            || ((data["BusquedaPorNombre"] !== '' && data["BusquedaPorNombre"] !== null) && (data["NombreDelCliente"] === '' || data["NombreDelCliente"] === null))){
                console.log('Prospecto despues: ', data);  
                const name = getCompanyName(data);
                if(name){
                    const hubspotCompany = await createOrUpdateCompanyProspectoInHubSpot( name , data );
                    if (hubspotCompany) {
                        logWithTimestamp(`Associating gestion visita ${hubspotVisita.id} with company ${hubspotCompany.id}`);
                        await associateGestionVisitaWithCompany(hubspotVisita.id, hubspotCompany.id);
                    } else {
                        logWithTimestamp(`No Medic number or Medic name given for form: ${form.formId}`);
                    }     
                }
            }
        }
    }
    console.log('All Forms Processed');
}catch (error) {
        logErrorWithTimestamp(error);
        return null, null;
    }
})();