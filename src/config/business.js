export const businessDetails = {
  name: "Kushi Digitals",
  tagline: "Photography & Digital Studio",

  phoneDisplay: "+91 7337471733",
  phoneNumber: "7337471733",
  phoneHref: "tel:+917337471733",

  whatsappDisplay: "+91 7337471733",
  whatsappNumber: "917337471733",
  whatsappUrl: "https://wa.me/917337471733",

  email: "kushidigitals8@gmail.com",
  emailHref: "mailto:kushidigitals8@gmail.com",

  address: {
    village: "Reddykancheru Village",
    mandal: "Bhogapuram Mandal",
    district: "Vizianagaram District",
    state: "Andhra Pradesh",
    pincode: "535216",
    display:
      "Reddykancheru Village, Bhogapuram Mandal, Vizianagaram District, Andhra Pradesh – 535216",
  },

  mapsUrl:
    "https://www.google.com/maps/search/?api=1&query=Reddykancheru%20Village%2C%20Bhogapuram%20Mandal%2C%20Vizianagaram%20District%2C%20Andhra%20Pradesh%20535216",

  socialLinks: {
    instagram:
      "https://www.instagram.com/kushidigitals_official",

    facebook:
      "https://www.facebook.com/profile.php?id=61565283843910",

    youtube:
      "https://www.youtube.com/@DigitalIncomeCreatorRaju",
  },

  businessHours: {
    days: "Monday – Sunday",
    time: "8:00 AM – 9:00 PM",
  },
};

export function createWhatsAppLink(
  message = "Hello Kushi Digitals, I would like to know more about your services.",
) {
  return `https://wa.me/${
    businessDetails.whatsappNumber
  }?text=${encodeURIComponent(message)}`;
}
