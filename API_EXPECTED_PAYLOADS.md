# API Expected Payloads

This file documents the JSON-shaped payloads implied by the current dummy data and local component state.

Notes:
- Local React Native assets are represented as string keys such as `"image1.png"` or `"Sports.wav"`.
- These are expected shapes, not live API responses.
- Fields that are currently hardcoded in UI state are preserved here so the contract stays aligned with the app.

## Auth

### Login request
```json
{
  "email": "email@email.com",
  "password": "********"
}
```

### Signup request
```json
{
  "firstName": "John",
  "lastName": "Doe",
  "email": "email@email.com",
  "password": "********"
}
```

### Email verification request
```json
{
  "email": "email@email.com",
  "code": "123456"
}
```

### Resend verification request
```json
{
  "email": "email@email.com"
}
```

## Account Profile

```json
{
  "name": "John Smith",
  "email": "john.doe@example.com",
  "username": "johnsmith",
  "isPro": false,
  "image": ""
}
```

## Personal Information Settings

```json
{
  "name": "John Smith",
  "email": "john.smith@example.com",
  "username": "johnsmith",
  "isPro": false,
  "image": ""
}
```

## Change Password

```json
{
  "currentPassword": "current-password",
  "newPassword": "new-password",
  "confirmPassword": "new-password"
}
```

## Notification Preferences

```json
{
  "appUpdates": true,
  "newMessages": true,
  "billingEmails": false
}
```

## Security

```json
{
  "twoFactorEnabled": true,
  "devices": [
    {
      "id": "desktop",
      "kind": "laptop",
      "title": "5 Laptop, PC(s)",
      "subtitle": "Windows, macOS, IdeaPad..."
    },
    {
      "id": "android",
      "kind": "phone",
      "title": "4 Android(s)",
      "subtitle": "Tab14, Samsung GalaxyS25,.."
    }
  ],
  "currentDevice": {
    "title": "Iphone 16 Pro",
    "platform": "ios",
    "version": "26.3.1"
  }
}
```

## Trees List

```json
{
  "trees": [
    {
      "id": 1,
      "name": "The squad",
      "memberCount": 10,
      "coverImage": "image4.png"
    },
    {
      "id": 2,
      "name": "My Family",
      "memberCount": 10,
      "coverImage": "image2.png"
    },
    {
      "id": 3,
      "name": "Ramy's Family",
      "memberCount": 10,
      "coverImage": "image3.png"
    },
    {
      "id": 4,
      "name": "The Team",
      "memberCount": 10,
      "coverImage": "image1.png"
    },
    {
      "id": 5,
      "name": "Cousins",
      "memberCount": 10,
      "coverImage": "image2.png"
    }
  ]
}
```

## Tree Screen Data

```json
{
  "people": [
    {
      "id": "0",
      "parentIds": [],
      "name": "Lea Smith Sr.",
      "relation": "Mother",
      "birthDate": "22/09/1970",
      "image": "https://images.unsplash.com/photo-1517841905240-472988babdf9?w=300&q=80"
    },
    {
      "id": "1",
      "parentIds": [],
      "name": "John Smith Sr.",
      "relation": "Father",
      "birthDate": "22/09/1970",
      "image": "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=300&q=80"
    },
    {
      "id": "2",
      "parentIds": ["0", "1"],
      "name": "John Smith",
      "relation": "Son",
      "birthDate": "22/09/1970",
      "image": "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=300&q=80"
    },
    {
      "id": "9",
      "parentIds": ["0", "1"],
      "hideLinkToPrimaryParent": true,
      "name": "Yara",
      "relation": "WIFE",
      "birthDate": "22/09/1970",
      "image": "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=300&q=80"
    },
    {
      "id": "15",
      "parentIds": ["13", "14"],
      "name": "Tia",
      "relation": "DAUGHTER",
      "birthDate": "22/09/2000",
      "image": "https://images.unsplash.com/photo-1488426862026-3ee34a7d66df?w=300&q=80"
    }
  ]
}
```

## Home Screen

```json
{
  "welcomeUser": "John Smith",
  "favorites": [
    {
      "id": 0,
      "name": "Maria Smith",
      "type": "Sister",
      "image": "image1.png"
    },
    {
      "id": 1,
      "name": "John Smith Sr.",
      "type": "Father",
      "image": "image2.png",
      "bornDate": "11/12/1970",
      "age": 50,
      "biography": "A dedicated professional with a passion for innovation and a commitment to excellence. With a background in engineering and a keen eye for detail, I strive to bring creativity and precision to every project.",
      "privateNotes": "A dedicated person who prioritizes creativity and excellence. With a background in engineering and a keen eye for detail, I strive to bring both innovation and precision to everything I do."
    },
    {
      "id": 2,
      "name": "Maroun Smith",
      "type": "Brother",
      "image": "image3.png"
    }
  ],
  "recent": [
    {
      "id": 0,
      "name": "John Smith Sr.",
      "type": "Father",
      "image": "image2.png",
      "bornDate": "11/12/1970",
      "age": 50,
      "biography": "A dedicated professional with a passion for innovation and a commitment to excellence. With a background in engineering and a keen eye for detail, I strive to bring creativity and precision to every project.",
      "privateNotes": "A dedicated person who prioritizes creativity and excellence. With a background in engineering and a keen eye for detail, I strive to bring both innovation and precision to everything I do."
    },
    {
      "id": 1,
      "name": "Jane Smith",
      "type": "Grandmother",
      "image": "image3.png"
    }
  ]
}
```

## Create Tree

```json
{
  "treeName": "The Squad",
  "coverImage": "selected-image-uri-or-asset-key",
  "actions": {
    "continue": true,
    "copyExistingTree": false
  }
}
```

## Add New Member

```json
{
  "step": 0,
  "name": "",
  "dateOfBirth": null,
  "bio": "",
  "customGreeting": "",
  "relation": "",
  "nickname": "",
  "isNotRelatedMember": false,
  "selectedImageUri": null,
  "recordingPath": null,
  "isRecording": false,
  "isPlayingRecording": false
}
```

## Chat

### Chat started payload
```json
{
  "chatId": "chat_001",
  "voiceVersionLabel": "VOICE VERSION 01",
  "familyLabel": "MY FAMILY",
  "composerPlaceholder": "I want to share something with you...",
  "messages": [
    {
      "id": 1,
      "senderName": "You",
      "senderLabel": "you",
      "time": "9:17 PM",
      "text": "Help how are you today?",
      "type": "outgoing"
    },
    {
      "id": 2,
      "senderName": "GRAMMA",
      "senderLabel": "gramma",
      "time": "9:18 PM",
      "text": "",
      "type": "incoming"
    }
  ]
}
```

### Incoming voice message
```json
{
  "id": 2,
  "senderName": "Jane Doe",
  "senderLabel": "jane-doe",
  "time": "9:18 PM",
  "text": "",
  "type": "incoming",
  "image": "image2",
  "audioSource": "Sports.wav",
  "transcript": "Hey! I'm doing really well, thank you. My day's been pretty good so far - just staying productive and getting a few things done. How about you? What's been the highlight of your day?"
}
```

### Outgoing text message
```json
{
  "id": 1700000000000,
  "senderName": "You",
  "senderLabel": "you",
  "time": "9:17 PM",
  "text": "Hello",
  "type": "outgoing"
}
```

## Notifications Screen

```json
{
  "timestamp": "LAST WEDNESDAY AT 9:42 AM",
  "notifications": [
    {
      "id": "monthly-backup-tinted",
      "message": "Your monthly backup is ready.",
      "tinted": true
    },
    {
      "id": "monthly-backup",
      "message": "Your monthly backup is ready."
    },
    {
      "id": "tree-backed-up",
      "message": "\"My Family\" tree was successfully backed up."
    },
    {
      "id": "grandma-anniversary",
      "message": "“It’s been 1 year since “Grandma” was added.”"
    }
  ]
}
```

## Archive

```json
{
  "storage": {
    "total": "150 GB",
    "used": "14.3GB",
    "available": "5.7GB",
    "usedRatio": 0.715
  },
  "recentSessions": [
    {
      "id": "1",
      "title": "Version 20",
      "duration": "04:03:09",
      "size": "23,56 MB",
      "thumbnail": "image3.png",
      "memberName": "Maria Smith",
      "versionName": "version 1.0",
      "lastBackup": "Mar 1, 2026",
      "sheetDuration": "15:32",
      "sheetSize": "45 MB"
    }
  ],
  "recordings": [
    {
      "id": "r1",
      "name": "Maria Smith",
      "version": "VERSION 1.0",
      "size": "23,56 MB"
    }
  ]
}
```

## Billing

```json
{
  "cards": [
    {
      "id": 1,
      "icon": "",
      "cardNumber": "1234 5678 9012 3456",
      "expiryDate": "01/2026",
      "isDefault": true
    }
  ],
  "billingHistory": [
    {
      "id": 1,
      "date": "2026-01-01",
      "price": "$80.00",
      "planType": "Pro Plan"
    },
    {
      "id": 4,
      "date": "2026-04-01",
      "price": "$80.00",
      "planType": "Pro Plan"
    }
  ]
}
```

## Preservation Plans

```json
{
  "billingPeriod": "monthly",
  "plans": [
    {
      "id": "heritage",
      "name": "Heritage",
      "subtitle": "Perfect for individuals starting their family legacy",
      "monthlyPrice": 5,
      "yearlyPrice": 48,
      "features": [
        "1 Family Tree",
        "Up to 5 family members",
        "2 voice versions per member",
        "30 minutes voice storage",
        "Basic AI conversations (50/month)",
        "Standard voice quality",
        "Email support",
        "Mobile access"
      ]
    },
    {
      "id": "legacy",
      "name": "Legacy",
      "subtitle": "For growing families who want to preserve more",
      "monthlyPrice": 19,
      "yearlyPrice": 190,
      "suggested": true,
      "features": [
        "Unlimited Family Trees",
        "Unlimited family members",
        "10 voice versions per member",
        "300 minutes voice storage",
        "Advanced AI conversations (500/month)",
        "HD voice quality",
        "Priority email support",
        "Mobile and web access"
      ]
    }
  ]
}
```

## Support / FAQ

```json
{
  "searchQuery": "",
  "items": [
    {
      "id": "1",
      "title": "Lorem ipsum dolor sit amet consectetur.",
      "body": "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua."
    },
    {
      "id": "2",
      "title": "How do I reset my password?",
      "body": "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua."
    },
    {
      "id": "3",
      "title": "Billing, plans, and invoices",
      "body": "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua."
    }
  ]
}
```

