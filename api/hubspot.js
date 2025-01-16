import FormData from 'form-data';
import axios from 'axios';
import 'dotenv/config';
import { hubspotAPI, hubspotAPIFile } from './hubspotapi.js';
import { getForms, getFormsById, getFormSubmision, getFormSubmisionById, getUserById, getFormSubmisionByIdFull } from './truecontext.js';
import { searchByLabel, extractLabelsToObject, logWithTimestamp, logErrorWithTimestamp } from '../utils/util.js';

export async function createOrUpdateContactInHubSpot(userId, Form) {
    try {   
        const hubspotContact = await searchContactByIdForm(userId);
        const user = await getUserById(Form.userId);
        if (hubspotContact) {
            logWithTimestamp(`Contact found with Id: ${userId}`);
            return await updateContactInHubSpot(hubspotContact.id, user);
        } else {
            logWithTimestamp(`No contact found with Id: ${userId}. Creating a new contact`);
            return await createContactInHubSpot(user);
        }
    } catch (error) {
        logErrorWithTimestamp(error);
        return null;
    }
}

export async function createOrUpdateGestionVisitaInHubSpot(visita) {
    try {
        const visitaId = await searchGestionVisitaByIdForm(visita.identifier);
        const dataVisita = await getFormSubmisionByIdFull(visita.identifier);
        const user = await getUserById(visita.userId);

        //console.log("dataVisita: ",dataVisita);
        const data = await extractLabelsToObject(dataVisita, ['name','referencia','Asesor','TipoVisita','TipoProspecto',
            'NombreProspecto','Acompañamiento','ConcretoLaVisita','ConQuienAgendoVisita','TipoDeCliente','CompraAOtroLab',
            'TipoDeProductos','Especialidad','EnfoqueNegocio','ComentariosOpcionale','EvidenciaVisita','NivelDeInteresVisita',
            'GerenteRegional','NoClienteMedico','NombreDelCliente','AliasDelCliente','BusquedaPorNombre','ObjetivoDeLaVisita']);

        if (visitaId) {
            logWithTimestamp(`Visita found. Updating visita ID: ${visitaId.id}`);
            const gestionVisita = await updateGestionVisitaInHubSpot( visitaId.id, data, user );
            return [ gestionVisita, data ];
        } else {
            logWithTimestamp(`No Visita found. Creating a new Visita for identifier: ${dataVisita.identifier}`);
            const gestionVisita = await createGestionVisitaInHubSpot( data, user );
            return [ gestionVisita, data ];
        }
            
    } catch (error) {
        console.error('Unexpected error in createOrUpdateGestionVisitaInHubSpot:', error.message);
        return null, null;
    }
}

export async function createOrUpdateDealInHubSpot(deal) {
    try {
        const dealId = await searchDealByIdForm(deal.identifier);
        const geo = await getFormSubmisionByIdFull(deal.identifier);

        const data = getDataForm(geo);

        if (dealId) {
            console.log(`Deal found. Updating deal ID: ${dealId.id}`);
            return await updateDealInHubSpot(dealId.id,deal, geo.geoStamp,geo);
        } else {
            console.log(`No deal found. Creating a new deal for id_mbudo: ${deal.identifier}`);
            return await createDealInHubSpot(deal, geo.geoStamp,geo);
        }
    } catch (error) {
        console.error('Unexpected error in createOrUpdateDealInHubSpot:', error.message);
        return null;
    }
}

export async function createOrUpdateCompanyInHubSpot( companyIds, companyData ) {
    try {
        logWithTimestamp(`searching companyID: ${companyIds} `);
        const companyId = await searchCompanyByIdCliente( companyIds );
        //console.log("companyData: ",companyData);
        if (companyId) {
            logWithTimestamp(`company found with id: ${companyIds} `);
            return await updateCompanyInHubSpot( companyId, companyData );
        } else {
            logWithTimestamp(`company not found with id: ${companyIds} `);
            return await createCompanyInHubSpot( companyData );
        }
    } catch (error) {
        logErrorWithTimestamp(error);
       //console.error('Unexpected error in createOrUpdateCompanyInHubSpot:', error.message);
        return null;
    }
}

//Support methods
async function searchContactByEmail() {
  try {
    const response = await hubspotAPI.get(`/crm/v3/objects/contacts`);

    if (response.data) {
      const contact = response.data;
      console.log('Contact found:', contact);
      //return contact; // Return existing contact ID
    } else {
      console.log('No contact found with email:', email);
      return null;
    }
  } catch (error) {
    if (error.response && error.response.status === 404) {
      console.log('No contact found with email:', email);
      await insertExceptionLog(error);
      return null;
    }
    console.error('Error searching contact by email:', error.response ? error.response.data : error);
    await insertExceptionLog(error);
    return null;
  }
}

async function searchContactByIdForm( idForm, maxRetries = 4, delay = 1000 ) {
    if (!idForm) {
        logWithTimestamp("Invalid or null idForm provided.");
        return null;
    }

    const payload = {
        filterGroups: [
            {
                filters: [
                    {
                        propertyName: 'tc_id', // Custom property used as unique identifier
                        operator: 'EQ',
                        value: idForm,
                    },
                ],
            },
        ],
        properties: ['firstname', 'email', 'phone', 'tc_id'], // Properties to fetch
    };

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            const response = await hubspotAPI.post('/crm/v3/objects/contacts/search', payload);

            if (response.data.total > 0) {
                const contact = response.data.results[0];
                logWithTimestamp(`Contact found with Id: ${idForm} on attempt ${attempt}`);
                return contact; // Return the found contact
            } else {
                logWithTimestamp(`No contact found with Id: ${idForm} on attempt ${attempt}`);
            }

            if (attempt < maxRetries) {
                await new Promise(resolve => setTimeout(resolve, delay * attempt)); // Exponential backoff
            }
        } catch (error) {
            const responseError = error.response ? error.response.data : { message: error.message };
            logErrorWithTimestamp(`Error on attempt ${attempt}: ${JSON.stringify(responseError)}`);
            if (attempt < maxRetries) {
                await new Promise(resolve => setTimeout(resolve, delay * attempt)); // Exponential backoff
            }
        }
    }

    logWithTimestamp(`Search failed after ${maxRetries} attempts for Id: ${idForm}`);
    return null; // After all retries, return null if no contact is found
}


async function updateContactInHubSpot( contactId, contact ) {
    const payload = {
        properties: {
            firstname: contact.firstName || '',
            lastname: contact.lastName || '',
            phone: contact.phoneNumber ||  '',
            tc_email: contact.email ||'',
            tc_id: contact.identifier || '',          
            //address: contact.address ||  '',
            //city: contact.town,
        }
    };

    try {

        const response = await hubspotAPI.patch(`/crm/v3/objects/contacts/${contactId}`, payload);

        logWithTimestamp(`Contact updated in HubSpot: ${contactId}`);

        return response.data;
    } catch ( error ) {
        const responseError = error.response ? error.response.data : { message: error.message };

        logErrorWithTimestamp( error );
        
        return null;
    }
}

async function createContactInHubSpot( contact ) {
    const payload = {
        properties: {
            firstname: contact.firstName || '',
            lastname: contact.lastName || '',
            phone: contact.phoneNumber || '',
            tc_email: contact.email || '',
            tc_id: contact.identifier || '',           
            //address: contact.address ||  '',
            //city: contact.town,
        },
    };
    try {
        const response = await hubspotAPI.post('/crm/v3/objects/contacts', payload);
        logWithTimestamp(`Contact created in HubSpot: ${response.data.id}`);
        return response.data;
    } catch ( error ) {
        logErrorWithTimestamp(error);
        return null;
    }
}

async function searchGestionVisitaByIdForm( idVisita ) {
    try {
        const response = await hubspotAPI.post('/crm/v3/objects/p44437320_gestion_visitas/search', {
            filterGroups: [
                {
                    filters: [
                        {
                            propertyName: 'identificador',
                            operator: 'EQ',
                            value: idVisita,
                        },
                    ],
                },
            ],
            properties: ['identificador'], // Specify properties to retrieve
        });

        if (response.data.total > 0) {
            logWithTimestamp(`Visita found for id_form ${idVisita}`);
            return response.data.results[0]; // Return the first matching deal
        }
        logWithTimestamp(`No Visita found for id_form ${idVisita}`);
        return null;
    } catch (error) {
        logErrorWithTimestamp(error);
        //console.error(`Error searching deal by id_form ${idVisita}:`, error.response ? error.response.data : error.message);
        throw error;
    }
}

async function createGestionVisitaInHubSpot( visitaData, User ) {
    const payload = {
        properties: {
            //Cliente
            no_cliente: visitaData["NoClienteMedico"] || "",
            cliente_alias: visitaData["AliasDelCliente"] || "",
            cliente_nombre: visitaData["NombreDelCliente"] || "",
            nombre_medico: visitaData["BusquedaPorNombre"] || "",
            enfoque_negocio: visitaData["EnfoqueNegocio"] || "",
            tipo_cliente: visitaData["TipoDeCliente"] || "",
            //Visita
            fecha: visitaData["Fecha"] || "",
            asesor: visitaData["Asesor"] || "",
            name: visitaData["name"] || "",
            objetivo_de_la_visita: visitaData["ObjetivoDeLaVisita"] || "",
            tipo_visita: visitaData["TipoVisita"] || "",
            acompanamiento: visitaData["Acompañamiento"] || "",
            //Ubicacion 
            direccion: visitaData["direccion"] || "",
            coordenadas: visitaData["coordenadas"] || "",
            identificador: visitaData["identifier"] || "",
            evidencia_visita: visitaData["EvidenciaVisita"] || "",
            //Anotacion
            comentarios: visitaData["ComentariosOpcionale"] || "",
            //Adicional
            numero_referencia: visitaData["referencia"] || "",
            prospecto_especialidad: visitaData["Especialidad"] || "",
            prospecto_nombre: visitaData["NombreProspecto"] || "",
            tipo_prospecto: visitaData["TipoProspecto"] || "",
            tc_user_first_name: User.firstName || "",
            tc_user_last_name:  User.lastName || "",
            tc_user_email: User.email || "",
            tc_user_id: User.identifier || "",
            //Cuestionario
            compra_a_otro_laboratorio: visitaData["CompraAOtroLab"] || "",
            con_quien_concreto_la_visita: visitaData["ConQuienAgendoVisita"] || "",        
            nivel_interes_visita: visitaData["NivelDeInteresVisita"] || "",
            tipo_de_productos: visitaData["TipoDeProductos"] || "",         
            concreto_visita: visitaData["ConcretoLaVisita"] || "",
            gerente__regional: visitaData["GerenteRegional"] || "",     
        }
    };

    try {
        const response = await hubspotAPI.post('/crm/v3/objects/p44437320_gestion_visitas', payload);

        logWithTimestamp(`Visita created in HubSpot: ${response.data.id}`);

        return response.data;
    } catch (error) {
        const responseError = error.response ? error.response.data : { message: error.message };
        logErrorWithTimestamp(error);
        //console.error('Error creating Visita in HubSpot:', responseError);

        return null;
    }
}

async function updateGestionVisitaInHubSpot( visitaId, visitaData, User ) {
    try {
        const payload = {
            properties: {
            //Cliente
            no_cliente: visitaData["NoClienteMedico"] || "",
            cliente_alias: visitaData["AliasDelCliente"] || "",
            cliente_nombre: visitaData["NombreDelCliente"] || "",
            nombre_medico: visitaData["BusquedaPorNombre"] || "",
            enfoque_negocio: visitaData["EnfoqueNegocio"] || "",
            tipo_cliente: visitaData["TipoDeCliente"] || "",
            //Visita
            fecha: visitaData["Fecha"] || "",
            asesor: visitaData["Asesor"] || "",
            name: visitaData["name"] || "",
            objetivo_de_la_visita: visitaData["ObjetivoDeLaVisita"] || "",
            tipo_visita: visitaData["TipoVisita"] || "",
            acompanamiento: visitaData["Acompañamiento"] || "",
            //Ubicacion 
            direccion: visitaData["direccion"] || "",
            coordenadas: visitaData["coordenadas"] || "",
            identificador: visitaData["identifier"] || "",
            evidencia_visita: visitaData["EvidenciaVisita"] || "",
            //Anotacion
            comentarios: visitaData["ComentariosOpcionale"] || "",
            //Adicional
            numero_referencia: visitaData["referencia"] || "",
            prospecto_especialidad: visitaData["Especialidad"] || "",
            prospecto_nombre: visitaData["NombreProspecto"] || "",
            tipo_prospecto: visitaData["TipoProspecto"] || "",
            tc_user_first_name: User.firstName || "",
            tc_user_last_name:  User.lastName || "",
            tc_user_email: User.email || "",
            tc_user_id: User.identifier || "",
            //Cuestionario
            compra_a_otro_laboratorio: visitaData["CompraAOtroLab"] || "",
            con_quien_concreto_la_visita: visitaData["ConQuienAgendoVisita"] || "",        
            nivel_interes_visita: visitaData["NivelDeInteresVisita"] || "",
            tipo_de_productos: visitaData["TipoDeProductos"] || "",         
            concreto_visita: visitaData["ConcretoLaVisita"] || "",
            gerente__regional: visitaData["GerenteRegional"] || "",     
        }   
        };
        const response = await hubspotAPI.patch(`/crm/v3/objects/p44437320_gestion_visitas/${visitaId}`, payload);

        logWithTimestamp(`Visita updated in HubSpot: ${visitaId}`);

        return response.data;
    } catch (error) {
        const responseError = error.response ? error.response.data : { message: error.message };
        console.error(`Error updating Visita in HubSpot (ID: ${visitaId}):`, responseError);
        logErrorWithTimestamp(error);
        //console.error(`Error updating Visita in HubSpot (ID: ${visitaId}):`, responseError);
        return null;
    }
}

async function searchDealByIdForm( idForm ) {
    try {
        const response = await hubspotAPI.post('/crm/v3/objects/deals/search', {
            filterGroups: [
                {
                    filters: [
                        {
                            propertyName: 'tc_id',
                            operator: 'EQ',
                            value: idForm,
                        },
                    ],
                },
            ],
            properties: ['id', 'dealname', 'amount'], // Specify properties to retrieve
        });

        if (response.data.total > 0) {
            console.log(`Deal found for id_form ${idForm}`);
            return response.data.results[0]; // Return the first matching deal
        }
        console.log(`No deal found for id_form ${idForm}`);
        return null;
    } catch (error) {
        console.error(`Error searching deal by id_form ${idForm}:`, error.response ? error.response.data : error.message);
        throw error;
    }
}

async function createDealInHubSpot(dealData, geoStamp, geo) {

    const {latitude, longitude, altitude} = geoStamp.coordinates;
    const payload = {
        properties: {
            dealname: geo.name, // Required: The name of the deal
            description: `ProductName:`,
            tc_id: dealData.identifier || "",
            tc_geo: `https://www.google.com/maps?q=${latitude},${longitude}` || "",
            amount: dealData.total || 0,
            createdate: dealData.serverReceiveDate || "",
            closedate: dealData.end || "", // Optional: Close date
            dealstage: '988747274', // Required: Deal stage
            pipeline: '673150570', // Required: Pipeline
        },
    };

    try {
        const response = await hubspotAPI.post('/crm/v3/objects/deals', payload);

        console.log(`Deal created in HubSpot: ${response.data.id}`);

        return response.data;
    } catch (error) {
        const responseError = error.response ? error.response.data : { message: error.message };

        console.error('Error creating deal in HubSpot:', responseError);

        return null;
    }
}

async function updateDealInHubSpot(dealId, dealData, geoStamp, geo) {
    const {latitude, longitude, altitude} = geoStamp.coordinates;
    const payload = {
        properties: {
            dealname: geo.name, // Required: The name of the deal
            description: `ProductName:`,
            tc_id: dealData.beneficiaryGroupName || "",
            tc_geo: `https://www.google.com/maps?q=${latitude},${longitude}` || "",
            amount: dealData.total || 0,
            closedate: dealData.end || "", // Optional: Close date
            dealstage: `988747274`, // Required: Deal stage
            pipeline: '673150570', // Required: Pipeline
        },
    };

    try {
        const response = await hubspotAPI.patch(`/crm/v3/objects/deals/${dealId}`, payload);

        console.log(`Deal updated in HubSpot: ${dealId.id}`);

        return response.data;
    } catch (error) {
        const responseError = error.response ? error.response.data : { message: error.message };

        console.error(`Error updating deal in HubSpot (ID: ${dealData.id}):`, responseError);
        return null;
    }
}

async function searchCompanyByIdCliente(idCliente, maxRetries = 2, delay = 500) {
    if (idCliente === null) {
        console.log("null id for company");
        return null;
    }

    const payload = {
        filterGroups: [
            {
                filters: [
                    {
                        propertyName: 'sap_id',
                        operator: 'EQ',
                        value: idCliente,
                    },
                ],
            },
        ],
        properties: ['name', 'no__medico', 'sap_id'],
    };

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            const response = await hubspotAPI.post('/crm/v3/objects/companies/search', payload);

            if (response.data.results.length > 0) {
                const company = response.data.results[0];
                logWithTimestamp(`Company found with id_cliente: ${idCliente} on attempt ${attempt}`);
                return company.id;
            } else {
                logWithTimestamp(`No company found with id_cliente: ${idCliente} on attempt ${attempt}`);
            }

            if (attempt < maxRetries) {
                await new Promise(resolve => setTimeout(resolve, delay * attempt)); // Exponential backoff
            }
        } catch (error) {
            logErrorWithTimestamp(error);
            return null;
        }
    }

    return null; // After all retries, return null if no company is found
}


async function createCompanyInHubSpot( companyData ) {
    const payload = {
        properties: {
            name: companyData["BusquedaPorNombre"] || '',
            sap_id: companyData["NoClienteMedico"] || '',
        }
    };
    try {
        const response = await hubspotAPI.post('/crm/v3/objects/companies', payload);
        logWithTimestamp(`Company created in HubSpot: ${response.data.id}`);
        return response.data;
    } catch (error) {
        const responseError = error.response ? error.response.data : { message: error.message };
        logErrorWithTimestamp(error);
        //console.error('Error creating company in HubSpot:', responseError);
        return null;
    }
}

async function updateCompanyInHubSpot( companyId, companyData ) {
    const payload = {
        properties: {
            name: companyData["BusquedaPorNombre"] || '',
            sap_id:companyData["NoClienteMedico"] || '',
        }
    };
    try {
        const response = await hubspotAPI.patch(`/crm/v3/objects/companies/${companyId}`, payload);
        logWithTimestamp(`Company updated in HubSpot: ${companyId}`);
        return response.data;
    } catch (error) {
        const responseError = error.response ? error.response.data : { message: error.message };
        logErrorWithTimestamp(error);
        //console.error(`Error updating company in HubSpot (ID: ${companyId}):`, responseError);
        return null;
    }
}

async function getAllContactsFromHubSpot() {
    const contacts = [];
    let after = null;

    try {
        do {
            const body = {
                filterGroups: [
                    {
                        filters: [
                            {
                                propertyName: 'id_mbudo',
                                operator: 'HAS_PROPERTY', // Ensure id_mbudo exists
                            },
                        ],
                    },
                ],
                properties: ['email', 'firstname', 'lastname', 'id_mbudo'], // Properties to fetch
                limit: 100, // Max contacts per request
                after: after, // Pagination cursor
            };

            const response = await hubspotAPI.post('/crm/v3/objects/contacts/search', body);

            console.log(`Fetched ${response.data.results.length} contacts in this batch.`);
            contacts.push(...response.data.results);

            // Update the pagination cursor
            if (response.data.paging && response.data.paging.next) {
                console.log(`Pagination: Next 'after' is ${response.data.paging.next.after}`);
                after = response.data.paging.next.after;
            } else {
                console.log('No more pages to fetch.');
                after = null;
            }
        } while (after);

        console.log(`Fetched a total of ${contacts.length} contacts with id_mbudo.`);
        return contacts;
    } catch (error) {
        console.error('Error fetching contacts from HubSpot:');
        if (error.response) {
            console.error(`Status: ${error.response.status}`);
            console.error(`Data: ${JSON.stringify(error.response.data, null, 2)}`);
        } else {
            console.error(error.message);
        }
        return [];
    }
}

export async function associateGestionVisitaWithContact( visitaId, contactId ) {
    try {
        const response = await hubspotAPI.put(`/crm/v3/objects/0-1/${contactId}/associations/2-39466492/${visitaId}/contact_to_gestion_visitas`);
        logWithTimestamp(`Associated gestion visita ${visitaId} with contact ${contactId}`);
        return response.data;
    } catch (error) {
        logErrorWithTimestamp(error);
        //console.error(`Error associating deal ${dealId} with contact ${contactId}:`, error.response ? error.response.data : error.message);    
        return null;
    }
}


export async function associateGestionVisitaWithCompany( visitaId, companyId ) {
    try {
        const response = await hubspotAPI.put(`/crm/v3/objects/0-2/${companyId}/associations/2-39466492/${visitaId}/company_to_gestion_visitas`);
        logWithTimestamp(`Associated gestion visita ${visitaId} with company ${companyId}`);
        return response.data;
    } catch (error) {
        logErrorWithTimestamp(error);
        //console.error(`Error associating deal ${dealId} with contact ${contactId}:`, error.response ? error.response.data : error.message);    
        return null;
    }
}

export async function associateDealWithContact( dealId, contactId ) {
    try {
        const response = await hubspotAPI.put(`/crm/v3/objects/deals/${dealId}/associations/contacts/${contactId}/3`);
        console.log(`Associated deal ${dealId} with contact ${contactId}`);
        return response.data;
    } catch (error) {
        console.error(`Error associating deal ${dealId} with contact ${contactId}:`, error.response ? error.response.data : error.message);
        await insertExceptionLog(error);     
        return null;
    }
}

async function associateDealWithCompany( dealId, companyId ) {
    try {
        // Construct the URL for the association endpoint
        const response = await hubspotAPI.put(`/crm/v3/objects/deals/${dealId}/associations/companies/${companyId}/341`);
        console.log(`Successfully associated deal ${dealId} with company ${companyId}`);
        return response.data;
    } catch (error) {
        const responseError = error.response ? error.response.data : { message: error.message };
        console.error(`Error associating deal ${dealId} with company ${companyId}:`, responseError);
        await insertExceptionLog(error);  
        return null;
    }
}

export async function uploadFileFromBytes(data) {
    //const filename = data.filename; // Save the file in the project folder
    const url = "https://api.hubapi.com/files/v3/files"; // HubSpot API endpoint
  const headers = {
    Authorization: `Bearer ${process.env.HUBSPOT_API_KEY}`, // Replace with your API Key or OAuth Token
  };

  try {
    // Decode the base64-encoded file into a Buffer
    const buffer = Buffer.from(data.bytes, "base64");

    // Write the file to the project folder
    // Prepare the multipart form-data
    const form = new FormData();
    const json = JSON.stringify({access: "PRIVATE", overwrite: true});
    form.append("file", buffer, { filename: data.filename }); // Add file data
    form.append("folderPath", "/TrueContext"); // Replace with your folder path
    //console.log("json: ",json);
    form.append(
      "options",json 
    );

    // Dynamically add headers for FormData
    const response = await axios.post(url, form, {
      headers: {
        ...headers,
        ...form.getHeaders(), // Ensure form-data headers are included
      },
    });

    console.log(`File uploaded successfully: ${response.data.url}`);
    return response.data.url; // Return the file URL
  } catch (error) {
    console.error(
      `Error uploading file ${data.filename}:`,
      error.response?.data || error.message
    );
    return null;
  }
}

function convertToMidnightUTC(dateString) {
    const date = new Date(dateString);
    // Set time to midnight UTC
    //date.setUTCHours(0, 0, 0, 0);
    return date.getTime();
}
